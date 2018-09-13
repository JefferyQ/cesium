defineSuite([
        'Core/Cartesian3',
        'Core/Cartographic',
        'Core/FeatureDetection',
        'Core/GeometryInstance',
        'Core/Math',
        'Core/Matrix4',
        'Core/OrthographicFrustum',
        'Core/PerspectiveFrustum',
        'Core/Ray',
        'Core/Rectangle',
        'Core/RectangleGeometry',
        'Core/ShowGeometryInstanceAttribute',
        'Core/Transforms',
        'Scene/Cesium3DTileset',
        'Scene/Cesium3DTileStyle',
        'Scene/EllipsoidSurfaceAppearance',
        'Scene/Primitive',
        'Scene/Scene',
        'Scene/SceneMode',
        'Specs/Cesium3DTilesTester',
        'Specs/createCanvas',
        'Specs/createScene'
    ], 'Scene/Pick', function(
        Cartesian3,
        Cartographic,
        FeatureDetection,
        GeometryInstance,
        CesiumMath,
        Matrix4,
        OrthographicFrustum,
        PerspectiveFrustum,
        Ray,
        Rectangle,
        RectangleGeometry,
        ShowGeometryInstanceAttribute,
        Transforms,
        Cesium3DTileset,
        Cesium3DTileStyle,
        EllipsoidSurfaceAppearance,
        Primitive,
        Scene,
        SceneMode,
        Cesium3DTilesTester,
        createCanvas,
        createScene) {
    'use strict';

    var scene;
    var primitives;
    var camera;
    var largeRectangle = Rectangle.fromDegrees(-1.0, -1.0, 1.0, 1.0);
    var smallRectangle = Rectangle.fromDegrees(-0.0001, -0.0001, 0.0001, 0.0001);
    var otherRectangle = Rectangle.fromDegrees(-45.0, -1.0, -43.0, 1.0);
    var primitiveRay;
    var otherRay;

    beforeAll(function() {
        scene = createScene({
            canvas : createCanvas(10, 10)
        });
        primitives = scene.primitives;
        camera = scene.camera;

        camera.setView({
            destination : largeRectangle
        });
        primitiveRay = new Ray(camera.positionWC, camera.directionWC);

        camera.setView({
            destination : otherRectangle
        });
        otherRay = new Ray(camera.positionWC, camera.directionWC);
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    beforeEach(function() {
        scene.mode = SceneMode.SCENE3D;
        scene.morphTime = SceneMode.getMorphTime(scene.mode);

        camera.setView({
            destination : largeRectangle
        });

        camera.frustum = new PerspectiveFrustum();
        camera.frustum.fov = CesiumMath.toRadians(60.0);
        camera.frustum.aspectRatio = 1.0;
    });

    afterEach(function() {
        primitives.removeAll();
    });

    function createRectangle(height, rectangle) {
        var e = new Primitive({
            geometryInstances: new GeometryInstance({
                geometry: new RectangleGeometry({
                    rectangle: rectangle,
                    vertexFormat: EllipsoidSurfaceAppearance.VERTEX_FORMAT,
                    granularity: CesiumMath.toRadians(20.0),
                    height: height
                })
            }),
            appearance: new EllipsoidSurfaceAppearance({
                aboveGround: false
            }),
            asynchronous: false
        });

        primitives.add(e);

        return e;
    }

    function createLargeRectangle(height) {
        return createRectangle(height, largeRectangle);
    }

    function createSmallRectangle(height) {
        return createRectangle(height, smallRectangle);
    }

    function createTileset() {
        var url = 'Data/Cesium3DTiles/Batched/BatchedWithTransformBox/tileset.json';
        var options = {
            maximumScreenSpaceError : 0
        };
        return Cesium3DTilesTester.loadTileset(scene, url, options).then(function(tileset) {
            var cartographic = Rectangle.center(largeRectangle);
            var cartesian = Cartographic.toCartesian(cartographic);
            tileset.root.transform = Matrix4.IDENTITY;
            tileset.modelMatrix = Transforms.eastNorthUpToFixedFrame(cartesian);
            return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset);
        });
    }

    describe('pick', function() {
        it('does not pick undefined window positions', function() {
            expect(function() {
                scene.pick(undefined);
            }).toThrowDeveloperError();
        });

        it('picks a primitive', function() {
            if (FeatureDetection.isInternetExplorer()) {
                // Workaround IE 11.0.9.  This test fails when all tests are ran without a breakpoint here.
                return;
            }

            var rectangle = createLargeRectangle(0.0);
            expect(scene).toPickPrimitive(rectangle);
        });

        it('picks a primitive with a modified pick search area', function() {
            if (FeatureDetection.isInternetExplorer()) {
                // Workaround IE 11.0.9.  This test fails when all tests are ran without a breakpoint here.
                return;
            }

            camera.setView({
                destination : Rectangle.fromDegrees(-10.0, -10.0, 10.0, 10.0)
            });

            var rectangle = createLargeRectangle(0.0);

            expect(scene).toPickPrimitive(rectangle, 7, 7, 5);
            expect(scene).notToPick(7, 7, 3);
        });

        it('does not pick primitives when show is false', function() {
            var rectangle = createLargeRectangle(0.0);
            rectangle.show = false;

            expect(scene).notToPick();
        });

        it('does not pick primitives when alpha is zero', function() {
            var rectangle = createLargeRectangle(0.0);
            rectangle.appearance.material.uniforms.color.alpha = 0.0;

            expect(scene).notToPick();
        });

        it('picks the top primitive', function() {
            createLargeRectangle(0.0);
            var rectangle2 = createLargeRectangle(1.0);

            expect(scene).toPickPrimitive(rectangle2);
        });

        it('picks in 2D', function() {
            scene.morphTo2D(0.0);
            camera.setView({ destination : largeRectangle });
            var rectangle = createLargeRectangle(0.0);
            scene.initializeFrame();
            expect(scene).toPickPrimitive(rectangle);
        });

        it('picks in 3D with orthographic projection', function() {
            var frustum = new OrthographicFrustum();
            frustum.aspectRatio = 1.0;
            frustum.width = 20.0;
            camera.frustum = frustum;

            // force off center update
            expect(frustum.projectionMatrix).toBeDefined();

            camera.setView({ destination : largeRectangle });
            var rectangle = createLargeRectangle(0.0);
            scene.initializeFrame();
            expect(scene).toPickPrimitive(rectangle);
        });
    });

    describe('drillPick', function() {
        it('drill picks a primitive with a modified pick search area', function() {
            if (FeatureDetection.isInternetExplorer()) {
                // Workaround IE 11.0.9.  This test fails when all tests are ran without a breakpoint here.
                return;
            }

            camera.setView({
                destination : Rectangle.fromDegrees(-10.0, -10.0, 10.0, 10.0)
            });

            var rectangle = createLargeRectangle(0.0);

            expect(scene).toDrillPickPrimitive(rectangle, 7, 7, 5);
            expect(scene).notToDrillPick(7, 7, 3);
        });

        it('does not drill pick undefined window positions', function() {
            expect(function() {
                scene.pick(undefined);
            }).toThrowDeveloperError();
        });

        it('drill picks multiple objects', function() {
            var rectangle1 = createLargeRectangle(0.0);
            var rectangle2 = createLargeRectangle(1.0);

            expect(scene).toDrillPickAndCall(function(pickedObjects) {
                expect(pickedObjects.length).toEqual(2);
                expect(pickedObjects[0].primitive).toEqual(rectangle2);
                expect(pickedObjects[1].primitive).toEqual(rectangle1);
            });
        });

        it('does not drill pick when show is false', function() {
            var rectangle1 = createLargeRectangle(0.0);
            var rectangle2 = createLargeRectangle(1.0);
            rectangle2.show = false;

            expect(scene).toDrillPickAndCall(function(pickedObjects) {
                expect(pickedObjects.length).toEqual(1);
                expect(pickedObjects[0].primitive).toEqual(rectangle1);
            });
        });

        it('does not drill pick when alpha is zero', function() {
            var rectangle1 = createLargeRectangle(0.0);
            var rectangle2 = createLargeRectangle(1.0);
            rectangle2.appearance.material.uniforms.color.alpha = 0.0;

            expect(scene).toDrillPickAndCall(function(pickedObjects) {
                expect(pickedObjects.length).toEqual(1);
                expect(pickedObjects[0].primitive).toEqual(rectangle1);
            });
        });

        it('can drill pick batched Primitives with show attribute', function() {
            var geometry = new RectangleGeometry({
                rectangle : Rectangle.fromDegrees(-50.0, -50.0, 50.0, 50.0),
                granularity : CesiumMath.toRadians(20.0),
                vertexFormat : EllipsoidSurfaceAppearance.VERTEX_FORMAT
            });

            var geometryWithHeight = new RectangleGeometry({
                rectangle : Rectangle.fromDegrees(-50.0, -50.0, 50.0, 50.0),
                granularity : CesiumMath.toRadians(20.0),
                vertexFormat : EllipsoidSurfaceAppearance.VERTEX_FORMAT,
                height : 0.01
            });

            var instance1 = new GeometryInstance({
                id : 1,
                geometry : geometry,
                attributes : {
                    show : new ShowGeometryInstanceAttribute(true)
                }
            });

            var instance2 = new GeometryInstance({
                id : 2,
                geometry : geometry,
                attributes : {
                    show : new ShowGeometryInstanceAttribute(false)
                }
            });

            var instance3 = new GeometryInstance({
                id : 3,
                geometry : geometryWithHeight,
                attributes : {
                    show : new ShowGeometryInstanceAttribute(true)
                }
            });

            var primitive = primitives.add(new Primitive({
                geometryInstances : [instance1, instance2, instance3],
                asynchronous : false,
                appearance : new EllipsoidSurfaceAppearance()
            }));

            expect(scene).toDrillPickAndCall(function(pickedObjects) {
                expect(pickedObjects.length).toEqual(2);
                expect(pickedObjects[0].primitive).toEqual(primitive);
                expect(pickedObjects[0].id).toEqual(3);
                expect(pickedObjects[1].primitive).toEqual(primitive);
                expect(pickedObjects[1].id).toEqual(1);
            });
        });

        it('can drill pick without ID', function() {
            var geometry = new RectangleGeometry({
                rectangle : Rectangle.fromDegrees(-50.0, -50.0, 50.0, 50.0),
                granularity : CesiumMath.toRadians(20.0),
                vertexFormat : EllipsoidSurfaceAppearance.VERTEX_FORMAT
            });

            var instance1 = new GeometryInstance({
                geometry : geometry,
                attributes : {
                    show : new ShowGeometryInstanceAttribute(true)
                }
            });

            var instance2 = new GeometryInstance({
                geometry : geometry,
                attributes : {
                    show : new ShowGeometryInstanceAttribute(true)
                }
            });

            var primitive = primitives.add(new Primitive({
                geometryInstances : [instance1, instance2],
                asynchronous : false,
                appearance : new EllipsoidSurfaceAppearance()
            }));

            expect(scene).toDrillPickAndCall(function(pickedObjects) {
                expect(pickedObjects.length).toEqual(1);
                expect(pickedObjects[0].primitive).toEqual(primitive);
            });
        });

        it('can drill pick batched Primitives without show attribute', function() {
            var geometry = new RectangleGeometry({
                rectangle : Rectangle.fromDegrees(-50.0, -50.0, 50.0, 50.0),
                granularity : CesiumMath.toRadians(20.0),
                vertexFormat : EllipsoidSurfaceAppearance.VERTEX_FORMAT
            });

            var geometryWithHeight = new RectangleGeometry({
                rectangle : Rectangle.fromDegrees(-50.0, -50.0, 50.0, 50.0),
                granularity : CesiumMath.toRadians(20.0),
                vertexFormat : EllipsoidSurfaceAppearance.VERTEX_FORMAT,
                height : 0.01
            });

            var instance1 = new GeometryInstance({
                id : 1,
                geometry : geometry
            });

            var instance2 = new GeometryInstance({
                id : 2,
                geometry : geometry
            });

            var instance3 = new GeometryInstance({
                id : 3,
                geometry : geometryWithHeight
            });

            var primitive = primitives.add(new Primitive({
                geometryInstances : [instance1, instance2, instance3],
                asynchronous : false,
                appearance : new EllipsoidSurfaceAppearance()
            }));

            expect(scene).toDrillPickAndCall(function(pickedObjects) {
                expect(pickedObjects.length).toEqual(1);
                expect(pickedObjects[0].primitive).toEqual(primitive);
                expect(pickedObjects[0].id).toEqual(3);
            });
        });

        it('stops drill picking when the limit is reached.', function() {
            createLargeRectangle(0.0);
            var rectangle2 = createLargeRectangle(1.0);
            var rectangle3 = createLargeRectangle(2.0);
            var rectangle4 = createLargeRectangle(3.0);

            expect(scene).toDrillPickAndCall(function(pickedObjects) {
                expect(pickedObjects.length).toEqual(3);
                expect(pickedObjects[0].primitive).toEqual(rectangle4);
                expect(pickedObjects[1].primitive).toEqual(rectangle3);
                expect(pickedObjects[2].primitive).toEqual(rectangle2);
            }, 3);
        });
    });

    describe('pickFromRay', function() {
        it('picks a tileset', function() {
            return createTileset().then(function(tileset) {
                expect(scene).toPickFromRay(tileset, primitiveRay);
            });
        });

        it('picks a translucent tileset', function() {
            return createTileset().then(function(tileset) {
                tileset.style = new Cesium3DTileStyle({
                    color : 'color("white", 0.5)'
                });
                expect(scene).toPickFromRay(tileset, primitiveRay);
            });
        });

        it('picks a primitive', function() {
            var rectangle = createLargeRectangle(0.0);
            expect(scene).toPickFromRay(rectangle, primitiveRay);
        });

        it('returns undefined if no primitives are picked', function() {
            createLargeRectangle(0.0);
            expect(scene).notToPickFromRay(otherRay);
        });

        it('does not pick primitives when show is false', function() {
            var rectangle = createLargeRectangle(0.0);
            rectangle.show = false;
            expect(scene).notToPickFromRay(primitiveRay);
        });

        it('does not pick primitives when alpha is zero', function() {
            var rectangle = createLargeRectangle(0.0);
            rectangle.appearance.material.uniforms.color.alpha = 0.0;
            expect(scene).notToPickFromRay(primitiveRay);
        });

        it('picks the top primitive', function() {
            createLargeRectangle(0.0);
            var rectangle2 = createLargeRectangle(1.0);
            expect(scene).toPickFromRay(rectangle2, primitiveRay);
        });

        it('throws if ray is undefined', function() {
            expect(function() {
                scene.pickFromRay(undefined);
            }).toThrowDeveloperError();
        });

        it('throws if scene camera is in 2D', function() {
            scene.morphTo2D(0.0);
            expect(function() {
                scene.pickFromRay(primitiveRay);
            }).toThrowDeveloperError();
        });

        it('throws if scene camera is in CV', function() {
            scene.morphToColumbusView(0.0);
            expect(function() {
                scene.pickFromRay(primitiveRay);
            }).toThrowDeveloperError();
        });
    });

    describe('drillPickFromRay', function() {
        it('drill picks a primitive', function() {
            var rectangle = createLargeRectangle(0.0);
            expect(scene).toDrillPickFromRay(rectangle, primitiveRay);
        });

        it('drill picks multiple primitives', function() {
            var rectangle1 = createLargeRectangle(0.0);
            var rectangle2 = createLargeRectangle(1.0);

            expect(scene).toDrillPickFromRayAndCall(function(pickedObjects) {
                expect(pickedObjects.length).toEqual(2);
                expect(pickedObjects[0].primitive).toEqual(rectangle2);
                expect(pickedObjects[1].primitive).toEqual(rectangle1);
            }, primitiveRay);
        });

        it('does not drill pick when show is false', function() {
            var rectangle1 = createLargeRectangle(0.0);
            var rectangle2 = createLargeRectangle(1.0);
            rectangle2.show = false;
            expect(scene).toDrillPickFromRayAndCall(function(pickedObjects) {
                expect(pickedObjects.length).toEqual(1);
                expect(pickedObjects[0].primitive).toEqual(rectangle1);
            }, primitiveRay);
        });

        it('does not drill pick when alpha is zero', function() {
            var rectangle1 = createLargeRectangle(0.0);
            var rectangle2 = createLargeRectangle(1.0);
            rectangle2.appearance.material.uniforms.color.alpha = 0.0;
            expect(scene).toDrillPickFromRayAndCall(function(pickedObjects) {
                expect(pickedObjects.length).toEqual(1);
                expect(pickedObjects[0].primitive).toEqual(rectangle1);
            }, primitiveRay);
        });

        it('returns empty array if no primitives are picked', function() {
            createLargeRectangle(0.0);
            createLargeRectangle(1.0);
            expect(scene).notToDrillPickFromRay(otherRay);
        });

        it('can drill pick batched Primitives with show attribute', function() {
            var geometry = new RectangleGeometry({
                rectangle : Rectangle.fromDegrees(-50.0, -50.0, 50.0, 50.0),
                granularity : CesiumMath.toRadians(20.0),
                vertexFormat : EllipsoidSurfaceAppearance.VERTEX_FORMAT,
                height : 0.0
            });

            var geometryWithHeight = new RectangleGeometry({
                rectangle : Rectangle.fromDegrees(-50.0, -50.0, 50.0, 50.0),
                granularity : CesiumMath.toRadians(20.0),
                vertexFormat : EllipsoidSurfaceAppearance.VERTEX_FORMAT,
                height : 1.0
            });

            var instance1 = new GeometryInstance({
                id : 1,
                geometry : geometry,
                attributes : {
                    show : new ShowGeometryInstanceAttribute(true)
                }
            });

            var instance2 = new GeometryInstance({
                id : 2,
                geometry : geometry,
                attributes : {
                    show : new ShowGeometryInstanceAttribute(false)
                }
            });

            var instance3 = new GeometryInstance({
                id : 3,
                geometry : geometryWithHeight,
                attributes : {
                    show : new ShowGeometryInstanceAttribute(true)
                }
            });

            var primitive = primitives.add(new Primitive({
                geometryInstances : [instance1, instance2, instance3],
                asynchronous : false,
                appearance : new EllipsoidSurfaceAppearance()
            }));

            expect(scene).toDrillPickFromRayAndCall(function(pickedObjects) {
                expect(pickedObjects.length).toEqual(2);
                expect(pickedObjects[0].primitive).toEqual(primitive);
                expect(pickedObjects[0].id).toEqual(3);
                expect(pickedObjects[1].primitive).toEqual(primitive);
                expect(pickedObjects[1].id).toEqual(1);
            }, primitiveRay);
        });

        it('can drill pick without ID', function() {
            var geometry = new RectangleGeometry({
                rectangle : Rectangle.fromDegrees(-50.0, -50.0, 50.0, 50.0),
                granularity : CesiumMath.toRadians(20.0),
                vertexFormat : EllipsoidSurfaceAppearance.VERTEX_FORMAT
            });

            var instance1 = new GeometryInstance({
                geometry : geometry,
                attributes : {
                    show : new ShowGeometryInstanceAttribute(true)
                }
            });

            var instance2 = new GeometryInstance({
                geometry : geometry,
                attributes : {
                    show : new ShowGeometryInstanceAttribute(true)
                }
            });

            var primitive = primitives.add(new Primitive({
                geometryInstances : [instance1, instance2],
                asynchronous : false,
                appearance : new EllipsoidSurfaceAppearance()
            }));

            expect(scene).toDrillPickFromRayAndCall(function(pickedObjects) {
                expect(pickedObjects.length).toEqual(1);
                expect(pickedObjects[0].primitive).toEqual(primitive);
            }, primitiveRay);
        });

        it('can drill pick batched Primitives without show attribute', function() {
            var geometry = new RectangleGeometry({
                rectangle : Rectangle.fromDegrees(-50.0, -50.0, 50.0, 50.0),
                granularity : CesiumMath.toRadians(20.0),
                vertexFormat : EllipsoidSurfaceAppearance.VERTEX_FORMAT,
                height : 0.0
            });

            var geometryWithHeight = new RectangleGeometry({
                rectangle : Rectangle.fromDegrees(-50.0, -50.0, 50.0, 50.0),
                granularity : CesiumMath.toRadians(20.0),
                vertexFormat : EllipsoidSurfaceAppearance.VERTEX_FORMAT,
                height : 1.0
            });

            var instance1 = new GeometryInstance({
                id : 1,
                geometry : geometry
            });

            var instance2 = new GeometryInstance({
                id : 2,
                geometry : geometry
            });

            var instance3 = new GeometryInstance({
                id : 3,
                geometry : geometryWithHeight
            });

            var primitive = primitives.add(new Primitive({
                geometryInstances : [instance1, instance2, instance3],
                asynchronous : false,
                appearance : new EllipsoidSurfaceAppearance()
            }));

            expect(scene).toDrillPickFromRayAndCall(function(pickedObjects) {
                expect(pickedObjects.length).toEqual(1);
                expect(pickedObjects[0].primitive).toEqual(primitive);
                expect(pickedObjects[0].id).toEqual(3);
            }, primitiveRay);
        });

        it('stops drill picking when the limit is reached.', function() {
            createLargeRectangle(0.0);
            var rectangle2 = createLargeRectangle(1.0);
            var rectangle3 = createLargeRectangle(2.0);
            var rectangle4 = createLargeRectangle(3.0);

            expect(scene).toDrillPickFromRayAndCall(function(pickedObjects) {
                expect(pickedObjects.length).toEqual(3);
                expect(pickedObjects[0].primitive).toEqual(rectangle4);
                expect(pickedObjects[1].primitive).toEqual(rectangle3);
                expect(pickedObjects[2].primitive).toEqual(rectangle2);
            }, primitiveRay, 3);
        });

        it('throws if ray is undefined', function() {
            expect(function() {
                scene.drillPickFromRay(undefined);
            }).toThrowDeveloperError();
        });

        it('throws if scene camera is in 2D', function() {
            scene.morphTo2D(0.0);
            expect(function() {
                scene.drillPickFromRay(primitiveRay);
            }).toThrowDeveloperError();
        });

        it('throws if scene camera is in CV', function() {
            scene.morphToColumbusView(0.0);
            expect(function() {
                scene.drillPickFromRay(primitiveRay);
            }).toThrowDeveloperError();
        });
    });

    describe('pickPositionFromRay', function() {
        it('returns intersection position with tileset', function() {
            if (!scene.pickPositionSupported) {
                return;
            }
            return createTileset().then(function() {
                expect(scene).toPickPositionFromRayAndCall(function(position) {
                    var minimumHeight = Cartesian3.fromRadians(0.0, 0.0).x;
                    var maximumHeight = minimumHeight + 20.0; // Rough height of tile
                    expect(position.x).toBeGreaterThan(minimumHeight);
                    expect(position.x).toBeLessThan(maximumHeight);
                    expect(position.y).toEqualEpsilon(0.0, CesiumMath.EPSILON5);
                    expect(position.z).toEqualEpsilon(0.0, CesiumMath.EPSILON5);
                }, primitiveRay);
            });
        });

        it('returns intersection position with translucent tileset', function() {
            if (!scene.pickPositionSupported) {
                return;
            }
            return createTileset().then(function(tileset) {
                tileset.style = new Cesium3DTileStyle({
                    color : 'color("white", 0.5)'
                });
                expect(scene).toPickPositionFromRayAndCall(function(position) {
                    var minimumHeight = Cartesian3.fromRadians(0.0, 0.0).x;
                    var maximumHeight = minimumHeight + 20.0; // Rough height of tile
                    expect(position.x).toBeGreaterThan(minimumHeight);
                    expect(position.x).toBeLessThan(maximumHeight);
                    expect(position.y).toEqualEpsilon(0.0, CesiumMath.EPSILON5);
                    expect(position.z).toEqualEpsilon(0.0, CesiumMath.EPSILON5);
                }, primitiveRay);
            });
        });

        it('returns intersection position with primitive', function() {
            if (!scene.pickPositionSupported) {
                return;
            }
            createSmallRectangle(0.0);
            expect(scene).toPickPositionFromRayAndCall(function(position) {
                var expectedPosition = Cartesian3.fromRadians(0.0, 0.0);
                expect(position).toEqualEpsilon(expectedPosition, CesiumMath.EPSILON5);
            }, primitiveRay);
        });

        it('returns intersection of the top primitive', function() {
            if (!scene.pickPositionSupported) {
                return;
            }
            createSmallRectangle(0.0);
            createSmallRectangle(1.0);
            expect(scene).toPickPositionFromRayAndCall(function(position) {
                var expectedPosition = Cartesian3.fromRadians(0.0, 0.0, 1.0);
                expect(position).toEqualEpsilon(expectedPosition, CesiumMath.EPSILON5);
            }, primitiveRay);
        });

        it('returns undefined if no primitive is hit', function() {
            if (!scene.pickPositionSupported) {
                return;
            }
            createSmallRectangle(0.0);
            expect(scene).toPickPositionFromRayAndCall(function(position) {
                expect(position).toBeUndefined();
            }, otherRay);
        });

        it('does not intersect primitives when show is false', function() {
            if (!scene.pickPositionSupported) {
                return;
            }
            var rectangle = createSmallRectangle(0.0);
            rectangle.show = false;
            expect(scene).toPickPositionFromRayAndCall(function(position) {
                expect(position).toBeUndefined();
            }, primitiveRay);
        });

        it('does not intersect primitives when alpha is zero', function() {
            if (!scene.pickPositionSupported) {
                return;
            }
            var rectangle = createSmallRectangle(0.0);
            rectangle.appearance.material.uniforms.color.alpha = 0.0;
            expect(scene).toPickPositionFromRayAndCall(function(position) {
                expect(position).toBeUndefined();
            }, primitiveRay);
        });

        it('throws if ray is undefined', function() {
            if (!scene.pickPositionSupported) {
                return;
            }
            expect(function() {
                scene.pickPositionFromRay(undefined);
            }).toThrowDeveloperError();
        });

        it('throws if scene camera is in 2D', function() {
            if (!scene.pickPositionSupported) {
                return;
            }
            scene.morphTo2D(0.0);
            expect(function() {
                scene.pickPositionFromRay(primitiveRay);
            }).toThrowDeveloperError();
        });

        it('throws if scene camera is in CV', function() {
            if (!scene.pickPositionSupported) {
                return;
            }
            scene.morphToColumbusView(0.0);
            expect(function() {
                scene.pickPositionFromRay(primitiveRay);
            }).toThrowDeveloperError();
        });

        it('throws if pick position is not supported', function() {
            if (!scene.pickPositionSupported) {
                return;
            }
            // Disable extension
            var depthTexture = scene.context._depthTexture;
            scene.context._depthTexture = false;

            expect(function() {
                scene.pickPositionFromRay(primitiveRay);
            }).toThrowDeveloperError();

            // Re-enable extension
            scene.context._depthTexture = depthTexture;
        });
    });

}, 'WebGL');
