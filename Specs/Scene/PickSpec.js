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
        'Scene/EllipsoidSurfaceAppearance',
        'Scene/Primitive',
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
        EllipsoidSurfaceAppearance,
        Primitive,
        SceneMode,
        Cesium3DTilesTester,
        createCanvas,
        createScene) {
    'use strict';

    var scene;
    var primitives;
    var camera;
    var primitiveRectangle = Rectangle.fromDegrees(-1.0, -1.0, 1.0, 1.0);
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
            destination : primitiveRectangle
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
            destination : primitiveRectangle
        });

        camera.frustum = new PerspectiveFrustum();
        camera.frustum.fov = CesiumMath.toRadians(60.0);
        camera.frustum.aspectRatio = 1.0;
    });

    afterEach(function() {
        primitives.removeAll();
    });

    function createRectangle() {
        var e = new Primitive({
            geometryInstances: new GeometryInstance({
                geometry: new RectangleGeometry({
                    rectangle: primitiveRectangle,
                    vertexFormat: EllipsoidSurfaceAppearance.VERTEX_FORMAT,
                    granularity: CesiumMath.toRadians(20.0)
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

    function createTileset() {
        var url = 'Data/Cesium3DTiles/Batched/BatchedWithTransformBox/tileset.json';
        var options = {
            maximumScreenSpaceError : 0
        };
        return Cesium3DTilesTester.loadTileset(scene, url, options).then(function(tileset) {
            var cartographic = Rectangle.center(primitiveRectangle);
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

            var rectangle = createRectangle();
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

            var rectangle = createRectangle();

            expect(scene).toPickPrimitive(rectangle, 7, 7, 5);
            expect(scene).notToPick(7, 7, 3);
        });

        it('does not pick primitives when show is false', function() {
            var rectangle = createRectangle();
            rectangle.show = false;

            expect(scene).notToPick();
        });

        it('does not pick primitives when alpha is zero', function() {
            var rectangle = createRectangle();
            rectangle.appearance.material.uniforms.color.alpha = 0.0;

            expect(scene).notToPick();
        });

        it('picks the top primitive', function() {
            createRectangle();
            var rectangle2 = createRectangle();
            rectangle2.height = 0.01;

            expect(scene).toPickPrimitive(rectangle2);
        });

        it('picks in 2D', function() {
            scene.morphTo2D(0.0);
            camera.setView({ destination : primitiveRectangle });
            var rectangle = createRectangle();
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

            camera.setView({ destination : primitiveRectangle });
            var rectangle = createRectangle();
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

            var rectangle = createRectangle();

            expect(scene).toDrillPickPrimitive(rectangle, 7, 7, 5);
            expect(scene).notToDrillPick(7, 7, 3);
        });

        it('does not drill pick undefined window positions', function() {
            expect(function() {
                scene.pick(undefined);
            }).toThrowDeveloperError();
        });

        it('drill picks multiple objects', function() {
            var rectangle1 = createRectangle();
            var rectangle2 = createRectangle();
            rectangle2.height = 0.01;

            expect(scene).toDrillPickAndCall(function(pickedObjects) {
                expect(pickedObjects.length).toEqual(2);
                expect(pickedObjects[0].primitive).toEqual(rectangle2);
                expect(pickedObjects[1].primitive).toEqual(rectangle1);
            });
        });

        it('does not drill pick when show is false', function() {
            var rectangle1 = createRectangle();
            var rectangle2 = createRectangle();
            rectangle2.height = 0.01;
            rectangle2.show = false;

            expect(scene).toDrillPickAndCall(function(pickedObjects) {
                expect(pickedObjects.length).toEqual(1);
                expect(pickedObjects[0].primitive).toEqual(rectangle1);
            });
        });

        it('does not drill pick when alpha is zero', function() {
            var rectangle1 = createRectangle();
            var rectangle2 = createRectangle();
            rectangle2.height = 0.01;
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
            var rectangle2 = createRectangle();
            var rectangle3 = createRectangle();
            var rectangle4 = createRectangle();
            rectangle2.height = 0.01;
            rectangle3.height = 0.02;
            rectangle4.height = 0.03;

            expect(scene).toDrillPickAndCall(function(pickedObjects) {
                expect(pickedObjects.length).toEqual(3);
                expect(pickedObjects[0].primitive).toEqual(rectangle4);
                expect(pickedObjects[1].primitive).toEqual(rectangle3);
                expect(pickedObjects[2].primitive).toEqual(rectangle2);
            });
        });
    });

    describe('pickFromRay', function() {
        it('picks a tileset', function() {
            return createTileset().then(function(tileset) {
                var picked = scene.pickFromRay(primitiveRay);
                expect(picked.primitive).toBe(tileset);
            });
        });

        it('picks a primitive', function() {
            var rectangle = createRectangle();
            var picked = scene.pickFromRay(primitiveRay);
            expect(picked.primitive).toBe(rectangle);
        });

        it('returns undefined if no primitives are picked', function() {
            createRectangle();
            var picked = scene.pickFromRay(otherRay);
            expect(picked).toBeUndefined();
        });

        it('does not pick primitives when show is false', function() {
            var rectangle = createRectangle();
            rectangle.show = false;
            var picked = scene.pickFromRay(primitiveRay);
            expect(picked).toBeUndefined();
        });

        it('does not pick primitives when alpha is zero', function() {
            var rectangle = createRectangle();
            rectangle.appearance.material.uniforms.color.alpha = 0.0;
            var picked = scene.pickFromRay(primitiveRay);
            expect(picked).toBeUndefined();
        });

        it('picks the top primitive', function() {
            createRectangle();
            var rectangle2 = createRectangle();
            rectangle2.height = 0.01;

            var picked = scene.pickFromRay(primitiveRay);
            expect(picked.primitive).toBe(rectangle2);
        });

        it('picks when main camera is in 3D with orthographic projection', function() {
            var frustum = new OrthographicFrustum();
            frustum.aspectRatio = 1.0;
            frustum.width = 20.0;
            camera.frustum = frustum;

            // force off center update
            expect(frustum.projectionMatrix).toBeDefined();

            camera.setView({ destination : primitiveRectangle });
            var rectangle = createRectangle();
            scene.initializeFrame();
            var picked = scene.pickFromRay(primitiveRay);
            expect(picked.primitive).toBe(rectangle);
        });

        it('picks when main camera is in CV', function() {
            // TODO
        });

        it('throws if ray is undefined', function() {
            expect(function() {
                scene.pickFromRay(undefined);
            }).toThrowDeveloperError();
        });

        // it('throws if main camera is in 2D', function() {
        //     scene.morphTo2D(0.0);
        //     expect(function() {
        //         scene.pickFromRay(primitiveRay);
        //     }).toThrowDeveloperError();
        // });
    });

    describe('pickPositionFromRay', function() {
        it('returns intersection position with tileset', function() {
            if (!scene.pickPositionSupported) {
                return;
            }

            return createTileset().then(function() {
                var position = scene.pickPositionFromRay(primitiveRay);
                var minimumHeight = Cartesian3.fromRadians(0, 0).x;
                var maximumHeight = minimumHeight + 20.0; // Rough height of tile
                expect(position.x).toBeGreaterThan(minimumHeight);
                expect(position.x).toBeLessThan(maximumHeight);
                expect(position.y).toEqualEpsilon(0.0, CesiumMath.EPSILON5);
                expect(position.z).toEqualEpsilon(0.0, CesiumMath.EPSILON5);
            });
        });

        it('returns intersection position with primitive', function() {
            if (!scene.pickPositionSupported) {
                return;
            }

            debugger;
            createRectangle();
            var position = scene.pickPositionFromRay(primitiveRay);
            var expectedPosition = Cartesian3.fromRadians(0, 0);
            expect(position).toEqualEpsilon(expectedPosition, position);

            var picked = scene.pickFromRay(primitiveRay);
            console.log(picked);

        });

        it('does not pick primitive', function() {
            createRectangle();
            var picked = scene.pickFromRay(otherRay);
            expect(picked).toBeUndefined();
        });

        it('does not pick primitives when show is false', function() {
            var rectangle = createRectangle();
            rectangle.show = false;
            var picked = scene.pickFromRay(primitiveRay);
            expect(picked).toBeUndefined();
        });

        it('does not pick primitives when alpha is zero', function() {
            var rectangle = createRectangle();
            rectangle.appearance.material.uniforms.color.alpha = 0.0;
            var picked = scene.pickFromRay(primitiveRay);
            expect(picked).toBeUndefined();
        });

        it('picks the top primitive', function() {
            createRectangle();
            var rectangle2 = createRectangle();
            rectangle2.height = 0.01;

            var picked = scene.pickFromRay(primitiveRay);
            expect(picked.primitive).toBe(rectangle2);
        });

        it('picks when main camera is in 3D with orthographic projection', function() {
            var frustum = new OrthographicFrustum();
            frustum.aspectRatio = 1.0;
            frustum.width = 20.0;
            camera.frustum = frustum;

            // force off center update
            expect(frustum.projectionMatrix).toBeDefined();

            camera.setView({ destination : primitiveRectangle });
            var rectangle = createRectangle();
            scene.initializeFrame();
            var picked = scene.pickFromRay(primitiveRay);
            expect(picked.primitive).toBe(rectangle);
        });

        it('picks when main camera is in CV', function() {
            // TODO
        });

        it('throws if ray is undefined', function() {
            expect(function() {
                scene.pickFromRay(undefined);
            }).toThrowDeveloperError();
        });

        // it('throws if main camera is in 2D', function() {
        //     scene.morphTo2D(0.0);
        //     expect(function() {
        //         scene.pickFromRay(primitiveRay);
        //     }).toThrowDeveloperError();
        // });
    });

}, 'WebGL');
