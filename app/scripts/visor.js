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
            this.guid = this._guid();
            this._initContainer(id, options);
        },
        _guid: function () {
            function s4() {
                return Math.floor((1 + Math.random()) * 0x10000)
                        .toString(16)
                        .substring(1);
            }
            return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
                    s4() + '-' + s4() + s4() + s4();
        },
        // map initialization methods
        _initContainer: function (id, options) {
            var instancia = this;

            this.mapa = L.map(id, options);

            var mapa = this.mapa;

            this.drawnItems = new L.FeatureGroup();
            this.mapa.addLayer(this.drawnItems);

            this.configurarSHP();

            L.easyButton('<img src="images/icn_shp.png" style="margin-left:-4px; margin-top:-2px">',
                    function (control, map) {
                        instancia.upButton.click();
                    },
                    {
                        position: 'topright'
                    }).addTo(this.mapa);

            L.easyButton('<img src="images/icn_coordenadas.png" style="margin-left:-4px; margin-top:-1px;">', function (control, map) {
                //control.getContainer().innerHTML = "<div style='width:150px;'><form><label>aaa</label></form></div>";
                if (!control.getContainer().querySelector(".contenedor-coordenadas")) {
                    var form_id = Math.random().toString(36).substring(7);
                    var div = document.createElement('div');
                    var form = document.createElement('form');
                    form.classList.add('formulario-gms');
                    form.innerHTML =
                            "<p>" +
                            "    <label class='lbl-tipo'>Latitud</label>" +
                            "    <input id='lat-g' class='gms' type='number' placeholder='G' required>" +
                            "    <label>°</label>" +
                            "    <input id='lat-m' class='gms' type='number' placeholder='M'>" +
                            "    <label>'</label>" +
                            "    <input id='lat-s' class='gms' type='number' placeholder='S.SS'>" +
                            "    <label>''</label>" +
                            "</p><p>" +
                            "    <label class='lbl-tipo'>Longitud</label>" +
                            "    <input id='lon-g' class='gms' type='number' placeholder='G'>" +
                            "    <label>°</label>" +
                            "    <input id='lon-m' class='gms' type='number' placeholder='M'>" +
                            "    <label>'</label>" +
                            "    <input id='lon-s' class='gms' type='number' placeholder='S.SS'>" +
                            "    <label>''</label>" +
                            "</p>" +
                            "  <p style='opacity:0.5;'><i>Coordenadas geográficas en SRS WGS84</i></p>" +
                            "  <hr>"
                            ;

                    div.id = form_id;
                    div.appendChild(form);

                    var btn = document.createElement('button');
                    btn.style.width = '150px';
                    btn.innerHTML = "Aceptar";
                    div.appendChild(btn);

                    btn.onclick = function () {
                        var lat_g = parseInt(form.querySelector('#lat-g').value);
                        var lat_m = parseInt(form.querySelector('#lat-m').value);
                        var lat_s = parseFloat(form.querySelector('#lat-s').value);

                        var lon_g = parseInt(form.querySelector('#lon-g').value);
                        var lon_m = parseInt(form.querySelector('#lon-m').value);
                        var lon_s = parseFloat(form.querySelector('#lon-s').value);

                        var inputs = form.querySelectorAll('input');
                        var errores = false;
                        for (var i = 0; i < inputs.length; i++) {
                            if (inputs[i].value && typeof (Number(inputs[i].value)) === "number") {
                                inputs[i].classList.remove('error');
                            } else {
                                inputs[i].classList.add('error');
                                errores = true;
                            }
                        }

                        if (!errores) {
                            var lat = lat_g + (lat_m / 60) + (lat_s / 3600);
                            var lon = lon_g + (lon_m / 60) + (lon_s / 3600);

                            instancia.drawnItems.addLayer(L.marker([lat, lon]));
                            control.getContainer().removeChild(control.getContainer().querySelector(".contenedor-coordenadas"));
                        }
                    };


                    div.classList.add("contenedor-coordenadas");
                    control.getContainer().appendChild(div);
                } else {
                    control.getContainer().removeChild(control.getContainer().querySelector(".contenedor-coordenadas"));
                }
            }, {position: 'topright'}).addTo(this.mapa);

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
                    featureGroup: this.drawnItems
                }
            });

            this.mapa.addControl(drawControl);

            this.mapa.on('draw:created', function (e) {
                var type = e.layerType;
                var layer = e.layer;

                instancia.drawnItems.addLayer(layer);
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
        },
        configurarSHP: function () {
            var instancia = this;

            function readerLoad(reader) {
                if (this.readyState !== 2 || this.error) {
                    return;
                } else {
                    shp(this.result).then(function (geojson) {
                        //L.geoJson(geojson).addTo(instancia.mapa);
                        var layers = L.geoJson(geojson).getLayers();
                        for (var i = 0; i < layers.length; i++) {
                            instancia.drawnItems.addLayer(layers[i]);
                        }
                        instancia.mapa.fitBounds(instancia.drawnItems.getBounds())
                    });

                    //worker.data(this.result, [this.result]);
                }
            }

            function handleZipFile(file) {

                var reader = new FileReader();
                reader.onload = readerLoad;
                reader.readAsArrayBuffer(file);
            }

            function handleFile(file) {

                //mapa.spin(true);
                if (file.name.slice(-3) === 'zip') {
                    return handleZipFile(file);
                }
                return;
            }

            function makeDiv() {
                var div = L.DomUtil.create('form', 'bgroup');
                div.id = "dropzone";
                return div;
            }

            function makeUp(div, handleFile) {
                var upButton = L.DomUtil.create('input', 'upStuff', div);
                upButton.type = "file";
                upButton.id = instancia.guid + "_input";
                upButton.onchange = function () {
                    var file = document.getElementById(instancia.guid + "_input").files[0];
                    handleFile(file);
                };
                return upButton;
            }

            function addFunction(map) {
                // create the control container with a particular class name
                var div = makeDiv();
                instancia.upButton = makeUp(div, handleFile);

                return div;
            }
            var NewButton = L.Control.extend({//creating the buttons
                options: {
                    position: 'topleft'
                },
                onAdd: addFunction
            });
            //add them to the map
            instancia.mapa.addControl(new NewButton());

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
