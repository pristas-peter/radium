import React from 'react';
import MouseUpListener from 'plugins/mouse-up-listener.js';
import objectAssign from 'object-assign';
const resolveStyles = require('inject!resolve-styles.js')({
  'exenv': require('__mocks__/exenv.js'),
  './prefixer': require('__mocks__/prefixer.js')
});

const genComponent = function() {
  return {
    setState: sinon.spy(function(newState) {
      objectAssign(this.state, newState);
    }),
    state: {},
    _radiumIsMounted: true
  };
};

// http://stackoverflow.com/a/25395068/13932
const permutate = function(arr) {
  const permutations = [];
  if (arr.length === 1) {
    return [arr];
  }

  for (let i = 0; i < arr.length; i++) {
    const subPerms = permutate(arr.slice(0, i).concat(arr.slice(i + 1)));
    for (let j = 0; j < subPerms.length; j++) {
      subPerms[j].unshift(arr[i]);
      permutations.push(subPerms[j]);
    }
  }

  return permutations;
};

const getChildrenArray = function(children) {
  const childrenArray = [];
  React.Children.forEach(children, function(child) {
    childrenArray.push(child);
  });
  return childrenArray;
};

describe('resolveStyles', function() {

  beforeEach(() => {
    MouseUpListener.subscribe = sinon.spy();
  });

  describe('no-op behavior', function() {

    it('handles null rendered element', function() {
      const component = genComponent();

      resolveStyles(component, null);
    });

    it('doesn\'t explode', function() {
      const component = genComponent();
      const renderedElement = <div />;

      const result = resolveStyles(component, renderedElement);

      expect(result).to.equal(renderedElement);
      expect(result.props).to.equal(renderedElement.props);
    });

    it('passes through normal style objects', function() {
      const component = genComponent();
      const renderedElement = <div style={{color: 'blue'}} />;

      const result = resolveStyles(component, renderedElement);

      expect(result.props.style).to.deep.equal(renderedElement.props.style);
    });

    it('passes through normal style objects of children', function() {
      const component = genComponent();
      const style = {color: 'blue'};
      const renderedElement = (
        <div>
          <div style={style} />
        </div>
      );

      const result = resolveStyles(component, renderedElement);
      const children = getChildrenArray(result.props.children);
      expect(children[0].props.style).to.deep.equal(style);
    });

    it('doesn\'t wrap string children in spans', function() {
      const component = genComponent();
      const renderedElement = <div>Hello</div>;

      const result = resolveStyles(component, renderedElement);
      expect(result.props.children).to.equal('Hello');
    });

    it('doesn\'t wrap number children in spans', function() {
      const component = genComponent();
      const renderedElement = <div>{88347}</div>;

      const result = resolveStyles(component, renderedElement);
      expect(result.props.children).to.equal(88347);
    });

    it('ignores invalid children', function() {
      const component = genComponent();

      // JSX won't let this through, so do it with a plain object instead
      const renderedElement = {props: {
        children: [null]
      }};

      const result = resolveStyles(component, renderedElement);
      const children = getChildrenArray(result.props.children);

      expect(children[0]).to.be.undefined;
    });

    it('only processes an element once', function() {
      sinon.spy(React, 'cloneElement');

      const component = genComponent();
      const renderedElement = (
        <div style={[
          {background: 'white'},
          {color: 'blue'}
        ]} />
      );

      let result = resolveStyles(component, renderedElement);
      result = resolveStyles(component, result);

      expect(result.props.style).to.deep.equal({
        background: 'white',
        color: 'blue'
      });

      expect(React.cloneElement).to.have.been.calledOnce;

      React.cloneElement.restore();
    });

  });

  describe('style array', function() {

    it('merges an array of style objects', function() {
      const component = genComponent();
      const renderedElement = (
        <div style={[
          {background: 'white'},
          {color: 'blue'}
        ]} />
      );

      const result = resolveStyles(component, renderedElement);

      expect(result.props.style).to.deep.equal({
        background: 'white',
        color: 'blue'
      });
    });

    it('skips falsy and non-object entries', function() {
      const component = genComponent();
      const renderedElement = (
        <div style={[
          {background: 'white'},
          false,
          null,
          ''.someUndefinedVar,
          '',
          [1, 2, 3],
          {color: 'blue'}
        ]} />
      );

      const result = resolveStyles(component, renderedElement);

      expect(result.props.style).to.deep.equal({
        background: 'white',
        color: 'blue'
      });
    });

    it('overwrites earlier styles with later ones', function() {
      const component = genComponent();
      const renderedElement = (
        <div style={[
          {background: 'white'},
          {background: 'blue'}
        ]} />
      );

      const result = resolveStyles(component, renderedElement);

      expect(result.props.style).to.deep.equal({
        background: 'blue'
      });
    });

    it('merges nested special styles', function() {
      const component = genComponent();
      const renderedElement = (
        <div style={[
          {':hover': { background: 'white'}},
          {':hover': {color: 'blue'}}
        ]} />
      );

      let result = resolveStyles(component, renderedElement);
      result.props.onMouseEnter();
      result = resolveStyles(component, renderedElement);

      expect(result.props.style).to.deep.equal({
        background: 'white',
        color: 'blue'
      });
    });

  });

  const createPseduoStyleTests = function(pseudo, onHandlerName, offHandlerName) {

    it('strips special styles if not applied', function() {
      const component = genComponent();
      const style = {background: 'blue'};
      style[':' + pseudo] = {background: 'red'};
      const renderedElement = <div style={style} />;

      const result = resolveStyles(component, renderedElement);

      expect(result.props.style).to.deep.equal({background: 'blue'});
    });

    it('adds appropriate handlers for ' + pseudo + ' styles', function() {
      const component = genComponent();
      const style = {background: 'blue'};
      style[':' + pseudo] = {background: 'red'};
      const renderedElement = <div style={style} />;

      const result = resolveStyles(component, renderedElement);

      expect(typeof result.props[onHandlerName]).to.equal('function');
      if (offHandlerName) {
        expect(typeof result.props[offHandlerName]).to.equal('function');
      }
    });

    it('adds ' + pseudo + ' styles ' + onHandlerName, function() {
      const component = genComponent();
      const style = {background: 'blue'};
      style[':' + pseudo] = {background: 'red'};
      const renderedElement = <div style={style} />;

      let result = resolveStyles(component, renderedElement);
      expect(result.props.style.background).to.equal('blue');

      result.props[onHandlerName]();

      expect(component.setState).to.have.been.called;

      // Must create a new renderedElement each time, same as React, since
      // resolveStyles mutates
      result = resolveStyles(component, renderedElement);
      expect(result.props.style.background).to.equal('red');
    });

    it('throws if multiple elements have the same key', function() {
      const component = genComponent();
      const style = {background: 'blue'};
      style[':' + pseudo] = {background: 'red'};

      // Use ref instead of key here because React.Children.map will discard
      // the duplicate keyed element.
      const renderedElement = (
        <div>
          <div ref="foo" style={style} />
          <div ref="foo" style={style} />
        </div>
      );

      expect(() => {
        resolveStyles(component, renderedElement);
      }).to.throw();
    });

    it('throws if multiple elements have no key', function() {
      const component = genComponent();
      const style = {background: 'blue'};
      style[':' + pseudo] = {background: 'red'};

      const renderedElement = (
        <div>
          <div style={style} />
          <div style={style} />
        </div>
      );

      expect(() => {
        resolveStyles(component, renderedElement);
      }).to.throw();
    });

    it('adds ' + pseudo + ' styles to correct element by key', function() {
      const component = genComponent();
      const style = {background: 'blue'};
      style[':' + pseudo] = {background: 'red'};

      const renderedElement = (
        <div>
          <div key="foo" />
          <div key="bar" style={style} />
        </div>
      );

      let result = resolveStyles(component, renderedElement);
      let children = getChildrenArray(result.props.children);
      expect(children[0].props.style).to.be.undefined;
      expect(children[1].props.style.background).to.equal('blue');

      children[1].props[onHandlerName]();

      result = resolveStyles(component, renderedElement);
      children = getChildrenArray(result.props.children);
      expect(children[0].props.style).to.be.undefined;
      expect(children[1].props.style.background).to.equal('red');
    });

    it('adds ' + pseudo + ' styles to correct element by ref', function() {
      const component = genComponent();
      const style = {background: 'blue'};
      style[':' + pseudo] = {background: 'red'};

      const renderedElement = (
        <div>
          <div ref="foo" />
          <div ref="bar" style={style} />
        </div>
      );

      let result = resolveStyles(component, renderedElement);
      let children = getChildrenArray(result.props.children);
      expect(children[0].props.style).to.be.undefined;
      expect(children[1].props.style.background).to.equal('blue');

      children[1].props[onHandlerName]();

      result = resolveStyles(component, renderedElement);
      children = getChildrenArray(result.props.children);
      expect(children[0].props.style).to.be.undefined;
      expect(children[1].props.style.background).to.equal('red');
    });

    if (offHandlerName) {
      it('removes ' + pseudo + ' styles ' + offHandlerName, function() {
        const component = genComponent();
        const style = {background: 'blue'};
        style[':' + pseudo] = {background: 'red'};
        const renderedElement = <div style={style} />;

        let result = resolveStyles(component, renderedElement);

        result.props[onHandlerName]();

        result = resolveStyles(component, renderedElement);
        expect(result.props.style.background).to.equal('red');

        result.props[offHandlerName]();

        expect(component.setState).to.have.been.called;

        result = resolveStyles(component, renderedElement);
        expect(result.props.style.background).to.equal('blue');
      });

      it('doesn\'t mutate state', function() {
        const component = genComponent();
        const style = {background: 'blue'};
        style[':' + pseudo] = {background: 'red'};
        const renderedElement = <div style={style} />;

        let result = resolveStyles(component, renderedElement);

        // Capturing a reference to the existing state is enough, since Radium
        // MUST return a new copy for shouldComponentUpdate.
        let previousState = component.state._radiumStyleState;
        result.props[onHandlerName]();
        // If they are still equal here, that means we mutated the existing
        // state, which will break shouldComponentUpdate.
        expect(component.state._radiumStyleState).not.to.equal(previousState);

        result = resolveStyles(component, renderedElement);

        previousState = component.state._radiumStyleState;
        result.props[offHandlerName]();
        expect(component.state._radiumStyleState).not.to.equal(previousState);
      });
    }

  };

  describe(':hover', function() {
    createPseduoStyleTests('hover', 'onMouseEnter', 'onMouseLeave');
  });

  describe(':focus', function() {
    createPseduoStyleTests('focus', 'onFocus', 'onBlur');
  });

  describe(':active', function() {
    createPseduoStyleTests('active', 'onMouseDown');

    it('subscribes to mouse up listener', function() {
      const component = genComponent();
      const renderedElement = <div style={{':active': {background: 'red'}}} />;

      resolveStyles(component, renderedElement);

      expect(MouseUpListener.subscribe).to.have.been.called;
    });

    it('adds active styles on mouse down', function() {
      const component = genComponent();
      const style = {
        background: 'blue',
        ':active': {background: 'red'}
      };
      const renderedElement = <div style={style} />;

      let result = resolveStyles(component, renderedElement);
      expect(result.props.style.background).to.equal('blue');

      result.props.onMouseDown();


      result = resolveStyles(component, renderedElement);
      expect(result.props.style.background).to.equal('red');
    });

    it('removes active styles on mouse up', function() {
      const component = genComponent();
      const style = {
        background: 'blue',
        ':active': {background: 'red'}
      };
      const renderedElement = <div style={style} />;

      let result = resolveStyles(component, renderedElement);

      result.props.onMouseDown();

      result = resolveStyles(component, renderedElement);
      expect(result.props.style.background).to.equal('red');

      // tigger global mouseup handler
      MouseUpListener.subscribe.firstCall.args[0]();

      result = resolveStyles(component, renderedElement);
      expect(result.props.style.background).to.equal('blue');
    });

    it('ignores mouse up if no active styles', function() {
      const component = genComponent();
      const style = {
        background: 'blue',
        ':active': {background: 'red'}
      };
      const renderedElement = <div style={style} />;

      let result = resolveStyles(component, renderedElement);

      result.props.onMouseDown();

      // tigger global mouseup handler
      MouseUpListener.subscribe.firstCall.args[0]();
      MouseUpListener.subscribe.firstCall.args[0]();

      result = resolveStyles(component, renderedElement);
      expect(result.props.style.background).to.equal('blue');
    });

    it('calls existing onMouseDown handler', function() {
      const component = genComponent();
      const style = {
        background: 'blue',
        ':active': {background: 'red'}
      };
      const originalOnMouseDown = sinon.spy();
      const renderedElement = (
        <div
          onMouseDown={originalOnMouseDown}
          style={style}
        />
      );

      let result = resolveStyles(component, renderedElement);

      result.props.onMouseDown();

      expect(originalOnMouseDown).to.have.been.called;

      result = resolveStyles(component, renderedElement);
      expect(result.props.style.background).to.equal('red');
    });
  });

  describe('multiple states triggered at once', function() {

    describe('applies pseudo styles in the defined order', function() {
      const component = genComponent();
      const stylePermutations = permutate([
        {name: ':active', style: {background: 'red'}},
        {name: ':focus', style: {background: 'yellow'}},
        {name: ':hover', style: {background: 'blue'}}
      ]);
      const onHandlerPermutations = permutate([
        'onFocus',
        'onMouseDown',
        'onMouseEnter'
      ]);

      const createMultiPseudoTest = function(pseudoStyles, onHandlers) {
        const name = 'applies pseudo styles in the defined order: ' +
          pseudoStyles.map(pseudo => pseudo.name).join(', ') +
          ' when handlers called in order: ' + onHandlers.join(', ');
        it(name, function() {
          const style = {};
          pseudoStyles.forEach(pseudo => {
            style[pseudo.name] = pseudo.style;
          });
          const renderedElement = <div style={style} />;

          let result = resolveStyles(component, renderedElement);

          onHandlers.forEach(onHandler => {
            result.props[onHandler]();
          });

          result = resolveStyles(component, renderedElement);

          expect(result.props.style.background).to.equal(
            pseudoStyles[pseudoStyles.length - 1].style.background
          );
        });
      };

      stylePermutations.forEach(pseudoStyles => {
        onHandlerPermutations.forEach(onHandlers => {
          createMultiPseudoTest(pseudoStyles, onHandlers);
        });
      });
    });
  });

  describe('React.Children.only', function() {
    it('doesn\'t break React.Children.only', function() {
      const component = genComponent();
      const renderedElement = <div><span /></div>;

      const result = resolveStyles(component, renderedElement);

      expect(React.Children.only(result.props.children)).to.be.ok;
    });

    it('doesn\'t break when only child isn\'t ReactElement', function() {
      const component = genComponent();
      const renderedElement = <div>Foo</div>;

      resolveStyles(component, renderedElement);
    });
  });

  describe('ReactComponentElement children', function() {
    it('doesn\'t resolve ReactComponentElement children', function() {
      const component = genComponent();
      class CustomComponent extends React.Component {}
      const style = {':hover': {}};
      const renderedElement = (
        <div>
          <CustomComponent style={style}/>
        </div>
      );

      const result = resolveStyles(component, renderedElement);
      const children = getChildrenArray(result.props.children);
      expect(children[0].props.style).to.deep.equal(style);
    });

    it('resolves ReactDOMElement children of ReactComponentElements', function() {
      const component = genComponent();
      class CustomComponent extends React.Component {}
      const style = [
        {background: 'white'},
        {color: 'blue'}
      ];
      const renderedElement = (
        <div style={style}>
          <CustomComponent style={style}>
            <div style={style} />
          </CustomComponent>
        </div>
      );

      const result = resolveStyles(component, renderedElement);
      expect(result.props.style).to.deep.equal({
        background: 'white',
        color: 'blue'
      });

      const children = getChildrenArray(result.props.children);
      expect(children[0].props.style).to.deep.equal(style);

      const componentChildren = getChildrenArray(children[0].props.children);
      expect(componentChildren[0].props.style).to.deep.equal({
        background: 'white',
        color: 'blue'
      });
    });
  });

  /* eslint-disable no-console */
  describe('warnings', function() {
    beforeEach(() => {
      sinon.stub(console, 'warn');
    });

    afterEach(() => {
      console.warn.restore();
      process.env.NODE_ENV = null;
    });

    it('warns when mixing longhand and shorthand properties', function() {
      const component = genComponent();
      const renderedElement = (
        <div style={{
          border: '1px solid black',
          borderWidth: '0 1px 1px 1px'
        }} />
      );

      resolveStyles(component, renderedElement);

      expect(console.warn).to.have.been.called;
      expect(console.warn.firstCall.args[0].indexOf('border'))
        .to.be.greaterThan(0);
    });

    it('warns when mixing longhand and shorthand properties in nested styles', function() {
      const component = genComponent();
      const renderedElement = (
        <div style={{
          ':hover': {
            border: '1px solid black',
            borderWidth: '0 1px 1px 1px'
          }
        }} />
      );

      resolveStyles(component, renderedElement);

      expect(console.warn).to.have.been.called;
      expect(console.warn.firstCall.args[0].indexOf('border'))
        .to.be.greaterThan(0);
    });

    it('does not warn when mixing border and borderRadius', function() {
      const component = genComponent();
      const renderedElement = (
        <div style={{
          border: '1px solid black',
          borderRadius: '5px'
        }} />
      );

      resolveStyles(component, renderedElement);

      expect(console.warn).to.not.have.been.called;
    });

    it('does not throw when passed a falsy entry value', function() {
      const component = genComponent();
      const renderedElement = <div style={{height: null }} />;

      expect(() => {
        resolveStyles(component, renderedElement);
      }).to.not.throw();
    });
  });
  /* eslint-enable no-console */
});
