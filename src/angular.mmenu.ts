﻿interface IAngularMMenuDirectiveAttributes extends ng.IAttributes {
    mmenuId: string;
    mmenuItems: string;
    mmenuOptions: string;
    mmenuParams: string;

    mmenuInvalidate: string;
}

module MMenu {
    export interface IMenuItem {
        href?: string | Function;
        text: string | IMenuItemText;
        items?: IMenuItem[];

        $class?: string;
    }

    export interface IMenuItemText {
        getText(): string;
        setText(newValue: string): void;

        onTextChanged(callback: IMenuItemTextChangedCallback): number;

        detachHandler(handler: number): void;
    }

    export interface IMenuItemTextChangedCallback {
        (newText?: string, oldText?: string): void;
    }
}

angular.module('angular-mmenu', [])
	   .directive('mmenu', () => {

        var angularMmenuIdAttr = 'angular-mmenu-id';

        var getValue = (scope, field: string): any => {
            if (field === undefined || field === null) {
                field = null;
            } else if (scope[field] !== null && scope[field] !== undefined) {
                field = scope[field];
            }

            return field;
        };

        var fillMenuItemControl = (ctrl: JQuery, menuItem: MMenu.IMenuItem) => {
            var contentCtrl: JQuery = null;
            if (menuItem.href === null || menuItem.href === undefined) {
                contentCtrl = $('<span />');
            }
            else {
                var href = $('<a />');

                if (typeof menuItem.href === "function") {
                    href.attr('href', 'javascript:void(0);')
                        .click(e => {
                            e.preventDefault();
                            var proc: Function = <Function>menuItem.href;
                            proc();
                        });
                }
                else if (menuItem.href === '#' || menuItem.href === '') {
                    href.attr('href', 'javascript:void(0);');
                }
                else {
                    href.attr('href', <string>menuItem.href);
                }

                contentCtrl = href;
            }

            if (angular.isString(menuItem.text)) {
                contentCtrl.text(<string>menuItem.text);
            } else {
                // must be IMenuItemText
                var obj = <MMenu.IMenuItemText>menuItem.text;
                contentCtrl.html(obj.getText());

                var listener = obj.onTextChanged((newValue) => {
                    contentCtrl.html(newValue);
                });

                contentCtrl.data('mmenu-dynamic-text', obj)
                    .data('mmenu-dynamic-text-listener', listener);

                contentCtrl.on("remove", () => {
                    var handler: MMenu.IMenuItemText = contentCtrl.data('mmenu-dynamic-text');
                    if (handler === null || handler === undefined) {
                        return null;
                    }

                    var currListener: number = contentCtrl.data('mmenu-dynamic-text-listener');

                    handler.detachHandler(currListener);
                });
            }

            ctrl.append(contentCtrl);

            if (menuItem.items !== null && menuItem.items !== undefined &&
                angular.isArray(menuItem.items) && menuItem.items.length > 0) {

                var root = $('<ul />');
                menuItem.items.forEach((x: MMenu.IMenuItem) => {
                    renderMenuItem(root, x);
                });

                ctrl.append(root);
            }

        };

        var renderMenuItem = (rootControl: JQuery, menuItem: MMenu.IMenuItem) => {
            var menuItemControl = $('<li/>');

            if (menuItem !== null && menuItem !== undefined) {
                fillMenuItemControl(menuItemControl, menuItem);

                if (menuItem.$class !== null && menuItem.$class !== undefined) {
                    menuItemControl.addClass(menuItem.$class);
                }
            }

            rootControl.append(menuItemControl);
        };

        var recreateMenu = (scope, attrs: IAngularMMenuDirectiveAttributes) => {
            var id = attrs.mmenuId;
            if (id === null || id === undefined || id === '') {
                console.warn('No angular-mmenu id is specified');
                return;
            }

            var newMenu = null;
            var existingMmenu = null;

            var jElement: JQuery = $('[' + angularMmenuIdAttr + '=' + id + ']');
            if (jElement.length === 0) {
                console.warn('No angular-mmenu host was found');
                return;
            }

            var value = scope[attrs.mmenuItems];
            if (value === null || value === undefined) {
                value = new Array<MMenu.IMenuItem>();
            }

            if (jElement[0].localName === 'nav') {
                // nav already initialized - cleaning it up
                jElement.empty();

                existingMmenu = jElement.data('mmenu');

                newMenu = jElement;
            }
            else {
                newMenu = $('<nav id="' + id + '" />');
            }

            var menu = $('<ul />');
            newMenu.append(menu);

            value.forEach((x: MMenu.IMenuItem) => {
                renderMenuItem(menu, x);
            });


            if (existingMmenu === null || existingMmenu === undefined) {
                var newMenuElement = angular.element(newMenu);
                var oldMenuElement = angular.element(jElement);

                oldMenuElement.replaceWith(newMenuElement);


                var opts = getValue(scope, attrs.mmenuOptions);
                var params = getValue(scope, attrs.mmenuParams);

                console.log('mmenu', id, opts, params);

                newMenu.attr(angularMmenuIdAttr, id);

                $(document).ready(() => {
                    newMenu.mmenu(opts, params);
                });
            }
            else if (existingMmenu._init != null && existingMmenu._init !== undefined) {
                existingMmenu._init();
            }
            else if (existingMmenu.init != null && existingMmenu.init !== undefined) {
                existingMmenu.init(menu);
            } else {
                console.error('angular mmenu could not be reinitialized due to missing init api method.');
            }
        };

        var linker = (id: string, scope, attrs: IAngularMMenuDirectiveAttributes) => {
            if (attrs.mmenuInvalidate !== null && attrs.mmenuInvalidate !== undefined && attrs.mmenuInvalidate !== '') {
                scope[attrs.mmenuInvalidate] = () => { recreateMenu(scope, attrs); };
            }

            scope.$watchCollection(attrs.mmenuItems, (value: MMenu.IMenuItem[]) => {
                recreateMenu(scope, attrs);
            });
        };

        return {
            restrict: 'E',
            replace: true,
            link: (scope, element: ng.IAugmentedJQuery, attrs: IAngularMMenuDirectiveAttributes) => {
                if (attrs.mmenuItems == null || attrs.mmenuItems == undefined) {
                    console.warn('mmenu-items attribute is not specified. No MMenu is created.');
                    element.remove();
                    return;
                }

                if (attrs.mmenuId == null || attrs.mmenuId == undefined) {
                    console.warn('mmenu-id attribute is not specified. No MMenu is created.');
                    element.remove();
                    return;
                }

                element.attr(angularMmenuIdAttr, attrs.mmenuId);
                linker(attrs.mmenuId, scope, attrs);
            }
        }
    });