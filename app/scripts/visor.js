//Based on Leaflet 0.0.7 http://leafletjs.com
(function (window, document, undefined) {
    var oldIGAC = window.IGAC,
            IGAC = {};

    IGAC.version = '1.0.0';

// define IGAC for Node module pattern loaders, including Browserify
    if (typeof module === 'object' && typeof module.exports === 'object') {
        module.exports = IGAC;

// define IGAC as an AMD module
    } else if (typeof define === 'function' && define.amd) {
        define(IGAC);
    }

// define IGAC as a global IGAC variable, saving the original IGAC to restore later if needed

    IGAC.noConflict = function () {
        window.IGAC = oldIGAC;
        return this;
    };

    window.IGAC = IGAC;


    IGAC.Util = {
        extend: function (dest) { // (Object[, Object, ...]) ->
            var sources = Array.prototype.slice.call(arguments, 1),
                    i, j, len, src;

            for (j = 0, len = sources.length; j < len; j++) {
                src = sources[j] || {};
                for (i in src) {
                    if (src.hasOwnProperty(i)) {
                        dest[i] = src[i];
                    }
                }
            }
            return dest;
        },
        bind: function (fn, obj) { // (Function, Object) -> Function
            var args = arguments.length > 2 ? Array.prototype.slice.call(arguments, 2) : null;
            return function () {
                return fn.apply(obj, args || arguments);
            };
        },
        setOptions: function (obj, options) {
            obj.options = IGAC.extend({}, obj.options, options);
            return obj.options;
        }
    };

// shortcuts for most used utility functions
    IGAC.extend = IGAC.Util.extend;
    IGAC.setOptions = IGAC.Util.setOptions;

    IGAC.Class = function () {};


    IGAC.Class.extend = function (props) {

        // extended class with the new prototype
        var NewClass = function () {

            // call the constructor
            if (this.initialize) {
                this.initialize.apply(this, arguments);
            }

            // call all constructor hooks
            if (this._initHooks) {
                this.callInitHooks();
            }
        };

        // instantiate class without calling constructor
        var F = function () {};
        F.prototype = this.prototype;

        var proto = new F();
        proto.constructor = NewClass;

        NewClass.prototype = proto;

        //inherit parent's statics
        for (var i in this) {
            if (this.hasOwnProperty(i) && i !== 'prototype') {
                NewClass[i] = this[i];
            }
        }

        // mix static properties into the class
        if (props.statics) {
            IGAC.extend(NewClass, props.statics);
            delete props.statics;
        }

        // mix includes into the prototype
        if (props.includes) {
            IGAC.Util.extend.apply(null, [proto].concat(props.includes));
            delete props.includes;
        }

        // merge options
        if (props.options && proto.options) {
            props.options = IGAC.extend({}, proto.options, props.options);
        }

        // mix given properties into the prototype
        IGAC.extend(proto, props);

        proto._initHooks = [];

        var parent = this;
        // jshint camelcase: false
        NewClass.__super__ = parent.prototype;

        // add method for calling all hooks
        proto.callInitHooks = function () {

            if (this._initHooksCalled) {
                return;
            }

            if (parent.prototype.callInitHooks) {
                parent.prototype.callInitHooks.call(this);
            }

            this._initHooksCalled = true;

            for (var i = 0, len = proto._initHooks.length; i < len; i++) {
                proto._initHooks[i].call(this);
            }
        };

        return NewClass;
    };


// method for adding properties to prototype
    IGAC.Class.include = function (props) {
        IGAC.extend(this.prototype, props);
    };

// merge new default options to the Class
    IGAC.Class.mergeOptions = function (options) {
        IGAC.extend(this.prototype.options, options);
    };

// add a constructor hook
    IGAC.Class.addInitHook = function (fn) { // (Function) || (String, args...)
        var args = Array.prototype.slice.call(arguments, 1);

        var init = typeof fn === 'function' ? fn : function () {
            this[fn].apply(this, args);
        };

        this.prototype._initHooks = this.prototype._initHooks || [];
        this.prototype._initHooks.push(init);
    };



    IGAC.Contenedor = IGAC.Class.extend({
        options: {
            /*
             center: LatLng,
             zoom: Number,
             layers: Array,
             */

        },
        initialize: function (id, options) { // (HTMLElement or String, Object)
            options = IGAC.setOptions(this, options);
            this._initContainer(id, options);
        },
        // map initialization methods
        _initContainer: function (id, options) {

            this.mapa = L.map(id, options);


            var drawnItems = new L.FeatureGroup();
            this.mapa.addLayer(drawnItems);


            L.drawLocal = {
                draw: {
                    toolbar: {
                        actions: {
                            title: 'Cancelar dibujo',
                            text: 'Cancelar'
                        },
                        finish: {
                            title: 'Finalizar dibujo',
                            text: 'Finalizar'
                        },
                        undo: {
                            title: 'Eliminar último punto',
                            text: 'Eliminar último punto'
                        },
                        buttons: {
                            polyline: 'Línea',
                            polygon: 'Polígono',
                            rectangle: 'Rectangulo',
                            circle: 'Circulo',
                            marker: 'Punto'
                        }
                    },
                    handlers: {
                        circle: {
                            tooltip: {
                                start: 'Haga clic y arrastre el ratón para dibujar un circulo.'
                            },
                            radius: 'Radio'
                        },
                        marker: {
                            tooltip: {
                                start: 'Haga clic sobre el mapa para añadir un punto.'
                            }
                        },
                        polygon: {
                            tooltip: {
                                start: 'Haga clic en el mapa para añadir el primer punto.',
                                cont: 'Haga clic en el mapa para añadir un punto.',
                                end: 'Haga clic en el punto inicial para finalizar.'
                            }
                        },
                        polyline: {
                            error: '<strong>Error:</strong> Las líneas no se pueden intersectar!',
                            tooltip: {
                                start: 'Haga clic en el mapa para añadir el primer punto.',
                                cont: 'Haga clic en el mapa para añadir un punto.',
                                end: 'Haga clic en el último punto para finalizar.'
                            }
                        },
                        rectangle: {
                            tooltip: {
                                start: 'Haga clic y arrastre el ratón para dibujar un rectángulo.'
                            }
                        },
                        simpleshape: {
                            tooltip: {
                                end: 'Levante el clic para finalizar.'
                            }
                        }
                    }
                },
                edit: {
                    toolbar: {
                        actions: {
                            save: {
                                title: 'Guardar Cambios.',
                                text: 'Guardar'
                            },
                            cancel: {
                                title: 'Cancelar la edición, descartar los cambios.',
                                text: 'Cancelar'
                            }
                        },
                        buttons: {
                            edit: 'Editar dibujos.',
                            editDisabled: 'No hay dibujos para editar.',
                            remove: 'Eliminar dibujos.',
                            removeDisabled: 'No hay dibujos para eliminar.'
                        }
                    },
                    handlers: {
                        edit: {
                            tooltip: {
                                text: 'Arrastre los puntos, o un marcador para editar el elemento.',
                                subtext: 'Seleccione cancelar para deshacer los cambios.'
                            }
                        },
                        remove: {
                            tooltip: {
                                text: 'haga click en un elemento para eliminarlo'
                            }
                        }
                    }
                }
            };
            /*
             var drawControl = new L.Control.Draw({
             position: 'topright',
             draw: {
             polygon: {
             title: 'Polígono',
             allowIntersection: false,
             drawError: {
             color: '#b00b00',
             timeout: 1000
             },
             shapeOptions: {
             color: '#bada55'
             },
             showArea: true
             },
             polyline: {
             metric: true
             //allowIntersection: false
             },
             circle: {
             shapeOptions: {
             color: '#662d91'
             }
             },
             marker: true
             },
             edit: {
             featureGroup: drawnItems
             }
             });
             */

            //Add the controls to the map
            var drawControlSettings = {
                position: 'topright',
                draw: {
                    polygon: {
                        title: 'Polígono',
                        allowIntersection: false,
                        drawError: {
                            color: '#b00b00',
                            timeout: 1000
                        },
                        shapeOptions: {
                            color: '#bada55'
                        },
                        showArea: true
                    },
                    polyline: {
                        metric: true
                                //allowIntersection: false
                    },
                    circle: {
                        shapeOptions: {
                            color: '#662d91'
                        }
                    },
                    marker: true
                },
                edit: {
                    featureGroup: drawnItems
                }
            };
            L.DrawToolbar.include({
                getModeHandlers: function (map) {
                    return [
                        {
                            enabled: this.options.polyline,
                            handler: new L.Draw.Polyline(map, this.options.polyline),
                            title: L.drawLocal.draw.toolbar.buttons.polyline
                        },
                        {
                            enabled: this.options.polygon,
                            handler: new L.Draw.Polygon(map, this.options.polygon),
                            title: L.drawLocal.draw.toolbar.buttons.polygon
                        },
                        {
                            enabled: this.options.rectangle,
                            handler: new L.Draw.Rectangle(map, this.options.rectangle),
                            title: L.drawLocal.draw.toolbar.buttons.rectangle
                        },
                        {
                            enabled: this.options.circle,
                            handler: new L.Draw.Circle(map, this.options.circle),
                            title: L.drawLocal.draw.toolbar.buttons.circle
                        },
                        {
                            enabled: this.options.marker,
                            handler: new L.Draw.Marker(map, this.options.marker),
                            title: L.drawLocal.draw.toolbar.buttons.marker
                        },
                        {
                            enabled: true,
                            handler: new L.Draw.CustomMarker(map, {icon: new L.Icon.Default()}),
                            title: 'Ingresar por coordenadas'
                        }
                    ];
                }
            });
            var drawControl = new L.Control.Draw(drawControlSettings);


            this.mapa.addControl(drawControl);

            this.mapa.on('draw:created', function (e) {
                var type = e.layerType;
                var layer = e.layer;

                drawnItems.addLayer(layer);
            });

            this.mapa.on('draw:edited', function (e) {
                if (e.layers) {
                    for (var i = 0; i < e.layers.getLayers().length; i++) {
                        var layer = e.layers.getLayers()[i];
                        if (layer.toGeoJSON() && layer.toGeoJSON().geometry) {
                        }
                    }
                }
            });
        },
        whenReady: function (callback, context) {
            if (this._loaded) {
                callback.call(context || this, this);
            } else {
                this.on('load', callback, context);
            }
            return this;
        }
    });


    IGAC.contenedor = function (id, options) {
        return new IGAC.Contenedor(id, options);
    };
    

    L.Draw.CustomMarker = L.Draw.Feature.extend({
        statics: {
            TYPE: 'marker'
        },
        options: {
            icon: new L.Icon.Default(),
            repeatMode: false,
            zIndexOffset: 2000 // This should be > than the highest z-index any markers
        },
        initialize: function (map, options) {
            // Save the type so super can fire, need to do this as cannot do this.TYPE :(
            this.type = L.Draw.Marker.TYPE;

            L.Draw.Feature.prototype.initialize.call(this, map, options);
        },
        addHooks: function () {
            L.Draw.Feature.prototype.addHooks.call(this);
            alert();
            if (this._map) {
                this._tooltip.updateContent({text: L.drawLocal.draw.handlers.marker.tooltip.start});

                // Same mouseMarker as in Draw.Polyline
                if (!this._mouseMarker) {
                    this._mouseMarker = L.marker(this._map.getCenter(), {
                        icon: L.divIcon({
                            className: 'leaflet-mouse-marker',
                            iconAnchor: [20, 20],
                            iconSize: [40, 40]
                        }),
                        opacity: 0,
                        zIndexOffset: this.options.zIndexOffset
                    });
                }

                this._mouseMarker
                        .on('click', this._onClick, this)
                        .addTo(this._map);

                this._map.on('mousemove', this._onMouseMove, this);
                this._map.on('click', this._onTouch, this);
            }
        },
        removeHooks: function () {
            L.Draw.Feature.prototype.removeHooks.call(this);

            if (this._map) {
                if (this._marker) {
                    this._marker.off('click', this._onClick, this);
                    this._map
                            .off('click', this._onClick, this)
                            .off('click', this._onTouch, this)
                            .removeLayer(this._marker);
                    delete this._marker;
                }

                this._mouseMarker.off('click', this._onClick, this);
                this._map.removeLayer(this._mouseMarker);
                delete this._mouseMarker;

                this._map.off('mousemove', this._onMouseMove, this);
            }
        },
        _onMouseMove: function (e) {
            var latlng = e.latlng;

            this._tooltip.updatePosition(latlng);
            this._mouseMarker.setLatLng(latlng);

            if (!this._marker) {
                this._marker = new L.Marker(latlng, {
                    icon: this.options.icon,
                    zIndexOffset: this.options.zIndexOffset
                });
                // Bind to both marker and map to make sure we get the click event.
                this._marker.on('click', this._onClick, this);
                this._map
                        .on('click', this._onClick, this)
                        .addLayer(this._marker);
            } else {
                latlng = this._mouseMarker.getLatLng();
                this._marker.setLatLng(latlng);
            }
        },
        _onClick: function () {
            this._fireCreatedEvent();

            this.disable();
            if (this.options.repeatMode) {
                this.enable();
            }
        },
        _onTouch: function (e) {
            // called on click & tap, only really does any thing on tap
            this._onMouseMove(e); // creates & places marker
            this._onClick(); // permanently places marker & ends interaction
        },
        _fireCreatedEvent: function () {
            var marker = new L.Marker.Touch(this._marker.getLatLng(), {icon: this.options.icon});
            L.Draw.Feature.prototype._fireCreatedEvent.call(this, marker);
        }
    });

}(window, document));
