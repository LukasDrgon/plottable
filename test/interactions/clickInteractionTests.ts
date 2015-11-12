///<reference path="../testReference.ts" />

describe("Click Interaction", () => {
  const SVG_WIDTH = 400;
  const SVG_HEIGHT = 400;

  let svg: d3.Selection<void>;
  let component: Plottable.Component;
  let clickInteraction: Plottable.Interactions.Click;

  beforeEach(() => {
    svg = TestMethods.generateSVG(SVG_WIDTH, SVG_HEIGHT);
    component = new Plottable.Component();
    component.renderTo(svg);

    clickInteraction = new Plottable.Interactions.Click();
    clickInteraction.attachTo(component);
  });

  afterEach(function() {
    if (this.currentTest.state === "passed") {
      svg.remove();
    }
  });

  class TestClickCallback {
    private called: boolean;
    private lastPoint: Plottable.Point;

    constructor() {
      this.called = false;
    }

    public call(point?: Plottable.Point) {
      this.called = true;
      this.lastPoint = point;
    }

    public getCalled() {
      return this.called;
    }

    public getLastPoint() {
      return this.lastPoint;
    }
  }

  function clickPoint(point: Plottable.Point, mode: TestMethods.InteractionMode = TestMethods.InteractionMode.Mouse) {
      clickPointWithMove(point, point, mode);
  }

  function clickPointWithMove(clickStartPoint: Plottable.Point,
                              clickEndPoint: Plottable.Point,
                              mode: TestMethods.InteractionMode) {
      TestMethods.triggerFakeInteractionEvent(mode,
                                              TestMethods.InteractionType.Start,
                                              component.content(),
                                              clickStartPoint.x,
                                              clickStartPoint.y);
      TestMethods.triggerFakeInteractionEvent(mode,
                                              TestMethods.InteractionType.End,
                                              component.content(),
                                              clickEndPoint.x,
                                              clickEndPoint.y);
  }

  describe("registering callbacks", () => {
    const testPoint = {x: 0, y: 0};

    it("registers callback using onClick", () => {
      const callback = new TestClickCallback();
      const call = () => callback.call();

      assert.strictEqual(clickInteraction.onClick(call), clickInteraction, "registration returns the calling Interaction");
      clickPoint(testPoint);

      assert.isTrue(callback.getCalled(), "Interaction should trigger the callback");
    });

    it("deregisters callback using offClick", () => {
      const callback = new TestClickCallback();
      const call = () => callback.call();

      clickInteraction.onClick(call);
      assert.strictEqual(clickInteraction.offClick(call), clickInteraction, "deregistration returns the calling Interaction");
      clickPoint(testPoint);

      assert.isFalse(callback.getCalled(), "Callback should be disconnected from the Interaction");
    });

    it("can register multiple onClick callbacks", () => {
      const callback1 = new TestClickCallback();
      const call1 = () => callback1.call();

      const callback2 = new TestClickCallback();
      const call2 = () => callback2.call();

      clickInteraction.onClick(call1);
      clickInteraction.onClick(call2);
      clickPoint(testPoint);

      assert.isTrue(callback1.getCalled(), "Interaction should trigger the first callback");
      assert.isTrue(callback2.getCalled(), "Interaction should trigger the second callback");
    });

    it("can deregister a callback without affecting the other ones", () => {
      const callback1 = new TestClickCallback();
      const call1 = () => callback1.call();

      const callback2 = new TestClickCallback();
      const call2 = () => callback2.call();

      clickInteraction.onClick(call1);
      clickInteraction.onClick(call2);
      clickInteraction.offClick(call1);
      clickPoint(testPoint);

      assert.isFalse(callback1.getCalled(), "Callback1 should be disconnected from the click interaction");
      assert.isTrue(callback2.getCalled(), "Callback2 should still exist on the click interaction");
    });
  });

  [TestMethods.InteractionMode.Mouse, TestMethods.InteractionMode.Touch].forEach((mode) => {
    describe(`invoking callbacks with ${TestMethods.InteractionMode[mode]} events`, () => {
      let callback: TestClickCallback;

      beforeEach(() => {
        callback = new TestClickCallback();
        clickInteraction.onClick((point: Plottable.Point) => callback.call(point));
      });

      it("invokes onClick callback on single location click", () => {
        const point = {x: SVG_WIDTH / 2, y: SVG_HEIGHT / 2};

        clickPoint(point, mode);

        assert.isTrue(callback.getCalled(), "callback called on clicking Component without moving pointer");
        assert.deepEqual(callback.getLastPoint(), point, "was passed correct point");
      });

      it("provides correct release point to onClick callback on click", () => {
        const startPoint = {x: SVG_WIDTH / 2, y: SVG_HEIGHT / 2};
        const endPoint = {x: SVG_WIDTH / 4, y: SVG_HEIGHT / 4};

        clickPointWithMove(startPoint, endPoint, mode);

        assert.isTrue(callback.getCalled(), "callback called on clicking and releasing inside the Component");
        assert.deepEqual(callback.getLastPoint(), endPoint, "was passed mouseup point");
      });

      it("does not invoke callback if click is released outside Component", () => {
        const startPoint = {x: SVG_WIDTH / 2, y: SVG_HEIGHT / 2};
        const endPoint = {x: SVG_WIDTH * 2, y: SVG_HEIGHT * 2};

        clickPointWithMove(startPoint, endPoint, mode);

        assert.isFalse(callback.getCalled(), "callback not called if click is released outside Component");
      });

      it("does not invoke callback if click is started outside Component", () => {
        const startPoint = {x: SVG_WIDTH * 2, y: SVG_HEIGHT * 2};
        const endPoint = {x: SVG_WIDTH / 2, y: SVG_HEIGHT / 2};

        clickPointWithMove(startPoint, endPoint, mode);

        assert.isFalse(callback.getCalled(), "callback not called if click was started outside Component");
      });

      it("invokes callback if the pointer is moved out then back inside the Component before releasing", () => {
        TestMethods.triggerFakeInteractionEvent(mode,
                                                TestMethods.InteractionType.Start,
                                                component.content(),
                                                SVG_WIDTH / 2,
                                                SVG_HEIGHT / 2);
        TestMethods.triggerFakeInteractionEvent(mode,
                                                TestMethods.InteractionType.Move,
                                                component.content(),
                                                SVG_WIDTH * 2,
                                                SVG_HEIGHT * 2);
        TestMethods.triggerFakeInteractionEvent(mode,
                                                TestMethods.InteractionType.End,
                                                component.content(),
                                                SVG_WIDTH / 2,
                                                SVG_HEIGHT / 2);
        assert.isTrue(callback.getCalled(),
                      "callback still called if the pointer is moved out then back inside the Component before releasing");
      });

      if (mode === TestMethods.InteractionMode.Touch) {
        it("does not trigger callback if touch event is cancelled", () => {
          TestMethods.triggerFakeTouchEvent("touchstart", component.content(), [{x: SVG_WIDTH / 2, y: SVG_HEIGHT / 2}]);
          TestMethods.triggerFakeTouchEvent("touchcancel", component.content(), [{x: SVG_WIDTH / 2, y: SVG_HEIGHT / 2}]);
          TestMethods.triggerFakeTouchEvent("touchend", component.content(), [{x: SVG_WIDTH / 2, y: SVG_HEIGHT / 2}]);
          assert.isFalse(callback.getCalled(), "callback not called if touch was cancelled");
        });
      }
    });
  });
});
