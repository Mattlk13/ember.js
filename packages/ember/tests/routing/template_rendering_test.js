/* eslint-disable no-console */
import { Route } from '@ember/-internals/routing';
import Controller from '@ember/controller';
import { Object as EmberObject, A as emberA } from '@ember/-internals/runtime';
import { moduleFor, ApplicationTestCase, getTextOf, runTask } from 'internal-test-helpers';
import { run } from '@ember/runloop';
import { Component } from '@ember/-internals/glimmer';

let originalConsoleError;

moduleFor(
  'Route - template rendering',
  class extends ApplicationTestCase {
    constructor() {
      super(...arguments);
      this.addTemplate('home', '<h3 class="hours">Hours</h3>');
      this.addTemplate('camelot', '<section id="camelot"><h3>Is a silly place</h3></section>');
      this.addTemplate('homepage', '<h3 id="troll">Megatroll</h3><p>{{this.name}}</p>');

      this.router.map(function () {
        this.route('home', { path: '/' });
      });

      originalConsoleError = console.error;
    }

    teardown() {
      super.teardown();
      console.error = originalConsoleError;
    }

    handleURLAborts(assert, path, deprecated) {
      run(() => {
        let router = this.applicationInstance.lookup('router:main');
        let result;

        if (deprecated !== undefined) {
          expectDeprecation(() => {
            result = router.handleURL(path);
          });
        } else {
          result = router.handleURL(path);
        }

        result.then(
          function () {
            assert.ok(false, 'url: `' + path + '` was NOT to be handled');
          },
          function (reason) {
            assert.ok(
              reason && reason.message === 'TransitionAborted',
              'url: `' + path + '` was to be aborted'
            );
          }
        );
      });
    }

    get currentPath() {
      let currentPath;
      expectDeprecation(() => {
        currentPath = this.applicationInstance.lookup('controller:application').get('currentPath');
      }, 'Accessing `currentPath` on `controller:application` is deprecated, use the `currentPath` property on `service:router` instead.');
      return currentPath;
    }

    async ['@test warn on URLs not included in the route set'](assert) {
      await this.visit('/');

      await assert.rejects(this.visit('/what-is-this-i-dont-even'), /\/what-is-this-i-dont-even/);
    }

    [`@test The Homepage with explicit template name in renderTemplate`](assert) {
      expectDeprecation('Usage of `renderTemplate` is deprecated.');
      this.add(
        'route:home',
        Route.extend({
          renderTemplate() {
            expectDeprecation(() => this.render('homepage'), /Usage of `render` is deprecated/);
          },
        })
      );

      return this.visit('/').then(() => {
        let text = this.$('#troll').text();
        assert.equal(text, 'Megatroll', 'the homepage template was rendered');
      });
    }

    async [`@test an alternate template will pull in an alternate controller`](assert) {
      expectDeprecation('Usage of `renderTemplate` is deprecated.');
      this.add(
        'route:home',
        Route.extend({
          renderTemplate() {
            expectDeprecation(() => this.render('homepage'), /Usage of `render` is deprecated/);
          },
        })
      );
      this.add(
        'controller:homepage',
        Controller.extend({
          init() {
            this._super(...arguments);
            this.name = 'Comes from homepage';
          },
        })
      );

      await this.visit('/');

      assert.equal(this.$('p').text(), 'Comes from homepage', 'the homepage template was rendered');
    }

    async [`@test An alternate template will pull in an alternate controller instead of controllerName`](
      assert
    ) {
      expectDeprecation('Usage of `renderTemplate` is deprecated.');
      this.add(
        'route:home',
        Route.extend({
          controllerName: 'foo',
          renderTemplate() {
            expectDeprecation(() => this.render('homepage'), /Usage of `render` is deprecated/);
          },
        })
      );
      this.add(
        'controller:foo',
        Controller.extend({
          init() {
            this._super(...arguments);
            this.name = 'Comes from foo';
          },
        })
      );
      this.add(
        'controller:homepage',
        Controller.extend({
          init() {
            this._super(...arguments);
            this.name = 'Comes from homepage';
          },
        })
      );

      await this.visit('/');

      assert.equal(this.$('p').text(), 'Comes from homepage', 'the homepage template was rendered');
    }

    async [`@test The template will pull in an alternate controller via key/value`](assert) {
      expectDeprecation('Usage of `renderTemplate` is deprecated.');
      this.router.map(function () {
        this.route('homepage', { path: '/' });
      });

      this.add(
        'route:homepage',
        Route.extend({
          renderTemplate() {
            expectDeprecation(
              () => this.render({ controller: 'home' }),
              /Usage of `render` is deprecated/
            );
          },
        })
      );
      this.add(
        'controller:home',
        Controller.extend({
          init() {
            this._super(...arguments);
            this.name = 'Comes from home.';
          },
        })
      );

      await this.visit('/');

      assert.equal(
        this.$('p').text(),
        'Comes from home.',
        'the homepage template was rendered from data from the HomeController'
      );
    }

    async [`@test The Homepage with explicit template name in renderTemplate and controller`](
      assert
    ) {
      expectDeprecation('Usage of `renderTemplate` is deprecated.');
      this.add(
        'controller:home',
        Controller.extend({
          init() {
            this._super(...arguments);
            this.name = 'YES I AM HOME';
          },
        })
      );
      this.add(
        'route:home',
        Route.extend({
          renderTemplate() {
            expectDeprecation(() => this.render('homepage'), /Usage of `render` is deprecated/);
          },
        })
      );

      await this.visit('/');

      assert.equal(this.$('p').text(), 'YES I AM HOME', 'The homepage template was rendered');
    }

    async [`@test Model passed via renderTemplate model is set as controller's model`](assert) {
      expectDeprecation('Usage of `renderTemplate` is deprecated.');
      this.addTemplate(
        'bio',
        '<p>Model: {{@model.name}}</p><p>Controller: {{this.model.name}}</p>'
      );
      this.add(
        'route:home',
        Route.extend({
          renderTemplate() {
            expectDeprecation(() => {
              this.render('bio', {
                model: { name: 'emberjs' },
              });
            }, /Usage of `render` is deprecated/);
          },
        })
      );

      await this.visit('/');

      let text = this.$('p').text();

      assert.ok(
        text.indexOf('Model: emberjs') > -1,
        'Passed model was available as the `@model` argument'
      );

      assert.ok(
        text.indexOf('Controller: emberjs') > -1,
        "Passed model was set as controller's `model` property"
      );
    }

    ['@test render uses templateName from route'](assert) {
      this.addTemplate('the_real_home_template', '<p>THIS IS THE REAL HOME</p>');
      this.add(
        'route:home',
        Route.extend({
          templateName: 'the_real_home_template',
        })
      );

      return this.visit('/').then(() => {
        let text = this.$('p').text();

        assert.equal(text, 'THIS IS THE REAL HOME', 'the homepage template was rendered');
      });
    }

    ['@test defining templateName allows other templates to be rendered'](assert) {
      this.addTemplate('alert', `<div class='alert-box'>Invader!</div>`);
      this.addTemplate('the_real_home_template', `<p>THIS IS THE REAL HOME</p>{{outlet 'alert'}}`);
      this.add(
        'route:home',
        Route.extend({
          templateName: 'the_real_home_template',
          actions: {
            showAlert() {
              expectDeprecation(() => {
                this.render('alert', {
                  into: 'home',
                  outlet: 'alert',
                });
              }, /Usage of `render` is deprecated/);
            },
          },
        })
      );

      return this.visit('/')
        .then(() => {
          let text = this.$('p').text();
          assert.equal(text, 'THIS IS THE REAL HOME', 'the homepage template was rendered');

          return runTask(() => this.appRouter.send('showAlert'));
        })
        .then(() => {
          let text = this.$('.alert-box').text();

          assert.equal(text, 'Invader!', 'Template for alert was rendered into the outlet');
        });
    }

    ['@test templateName is still used when calling render with no name and options'](assert) {
      expectDeprecation('Usage of `renderTemplate` is deprecated.');
      this.addTemplate('alert', `<div class='alert-box'>Invader!</div>`);
      this.addTemplate('home', `<p>THIS IS THE REAL HOME</p>{{outlet 'alert'}}`);

      this.add(
        'route:home',
        Route.extend({
          templateName: 'alert',
          renderTemplate() {
            expectDeprecation(() => this.render({}), /Usage of `render` is deprecated/);
          },
        })
      );

      return this.visit('/').then(() => {
        let text = this.$('.alert-box').text();

        assert.equal(text, 'Invader!', 'default templateName was rendered into outlet');
      });
    }

    ['@test Generated names can be customized when providing routes with dot notation'](assert) {
      expectDeprecation('Usage of `renderTemplate` is deprecated.');
      assert.expect(5);

      this.addTemplate('index', '<div>Index</div>');
      this.addTemplate('application', "<h1>Home</h1><div class='main'>{{outlet}}</div>");
      this.addTemplate('foo', "<div class='middle'>{{outlet}}</div>");
      this.addTemplate('bar', "<div class='bottom'>{{outlet}}</div>");
      this.addTemplate('bar.baz', '<p>{{this.name}}Bottom!</p>');

      this.router.map(function () {
        this.route('foo', { path: '/top' }, function () {
          this.route('bar', { path: '/middle', resetNamespace: true }, function () {
            this.route('baz', { path: '/bottom' });
          });
        });
      });

      this.add(
        'route:foo',
        Route.extend({
          renderTemplate() {
            assert.ok(true, 'FooBarRoute was called');
            return this._super(...arguments);
          },
        })
      );

      this.add(
        'route:bar.baz',
        Route.extend({
          renderTemplate() {
            assert.ok(true, 'BarBazRoute was called');
            return this._super(...arguments);
          },
        })
      );

      this.add(
        'controller:bar',
        Controller.extend({
          name: 'Bar',
        })
      );

      this.add(
        'controller:bar.baz',
        Controller.extend({
          name: 'BarBaz',
        })
      );

      return this.visit('/top/middle/bottom').then(() => {
        assert.ok(true, '/top/middle/bottom has been handled');
        let rootElement = document.getElementById('qunit-fixture');
        assert.equal(
          getTextOf(rootElement.querySelector('.main .middle .bottom p')),
          'BarBazBottom!',
          'The templates were rendered into their appropriate parents'
        );
      });
    }

    ["@test Child routes render into their parent route's template by default"](assert) {
      this.addTemplate('index', '<div>Index</div>');
      this.addTemplate('application', "<h1>Home</h1><div class='main'>{{outlet}}</div>");
      this.addTemplate('top', "<div class='middle'>{{outlet}}</div>");
      this.addTemplate('middle', "<div class='bottom'>{{outlet}}</div>");
      this.addTemplate('middle.bottom', '<p>Bottom!</p>');

      this.router.map(function () {
        this.route('top', function () {
          this.route('middle', { resetNamespace: true }, function () {
            this.route('bottom');
          });
        });
      });

      return this.visit('/top/middle/bottom').then(() => {
        assert.ok(true, '/top/middle/bottom has been handled');
        let rootElement = document.getElementById('qunit-fixture');
        assert.equal(
          getTextOf(rootElement.querySelector('.main .middle .bottom p')),
          'Bottom!',
          'The templates were rendered into their appropriate parents'
        );
      });
    }

    ['@test Child routes render into specified template'](assert) {
      expectDeprecation('Usage of `renderTemplate` is deprecated.');
      this.addTemplate('index', '<div>Index</div>');
      this.addTemplate('application', "<h1>Home</h1><div class='main'>{{outlet}}</div>");
      this.addTemplate('top', "<div class='middle'>{{outlet}}</div>");
      this.addTemplate('middle', "<div class='bottom'>{{outlet}}</div>");
      this.addTemplate('middle.bottom', '<p>Bottom!</p>');

      this.router.map(function () {
        this.route('top', function () {
          this.route('middle', { resetNamespace: true }, function () {
            this.route('bottom');
          });
        });
      });

      this.add(
        'route:middle.bottom',
        Route.extend({
          renderTemplate() {
            expectDeprecation(
              () => this.render('middle/bottom', { into: 'top' }),
              /Usage of `render` is deprecated/
            );
          },
        })
      );

      return this.visit('/top/middle/bottom').then(() => {
        assert.ok(true, '/top/middle/bottom has been handled');
        let rootElement = document.getElementById('qunit-fixture');
        assert.equal(
          rootElement.querySelectorAll('.main .middle .bottom p').length,
          0,
          'should not render into the middle template'
        );
        assert.equal(
          getTextOf(rootElement.querySelector('.main .middle > p')),
          'Bottom!',
          'The template was rendered into the top template'
        );
      });
    }

    ['@test Rendering into specified template with slash notation'](assert) {
      expectDeprecation('Usage of `renderTemplate` is deprecated.');
      this.addTemplate('person.profile', 'profile {{outlet}}');
      this.addTemplate('person.details', 'details!');

      this.router.map(function () {
        this.route('home', { path: '/' });
      });

      this.add(
        'route:home',
        Route.extend({
          renderTemplate() {
            expectDeprecation(() => {
              this.render('person/profile');
              this.render('person/details', { into: 'person/profile' });
            }, /Usage of `render` is deprecated/);
          },
        })
      );

      return this.visit('/').then(() => {
        let rootElement = document.getElementById('qunit-fixture');
        assert.equal(
          rootElement.textContent.trim(),
          'profile details!',
          'The templates were rendered'
        );
      });
    }

    ['@test Only use route rendered into main outlet for default into property on child'](assert) {
      expectDeprecation('Usage of `renderTemplate` is deprecated.');
      this.addTemplate('application', "{{outlet 'menu'}}{{outlet}}");
      this.addTemplate('posts', '{{outlet}}');
      this.addTemplate('posts.index', '<p class="posts-index">postsIndex</p>');
      this.addTemplate('posts.menu', '<div class="posts-menu">postsMenu</div>');

      this.router.map(function () {
        this.route('posts', function () {});
      });

      this.add(
        'route:posts',
        Route.extend({
          renderTemplate() {
            expectDeprecation(() => {
              this.render();
              this.render('posts/menu', {
                into: 'application',
                outlet: 'menu',
              });
            }, /Usage of `render` is deprecated/);
          },
        })
      );

      return this.visit('/posts').then(() => {
        assert.ok(true, '/posts has been handled');
        let rootElement = document.getElementById('qunit-fixture');
        assert.equal(
          getTextOf(rootElement.querySelector('div.posts-menu')),
          'postsMenu',
          'The posts/menu template was rendered'
        );
        assert.equal(
          getTextOf(rootElement.querySelector('p.posts-index')),
          'postsIndex',
          'The posts/index template was rendered'
        );
      });
    }

    ['@test Application template does not duplicate when re-rendered'](assert) {
      this.addTemplate('application', '<h3 class="render-once">I render once</h3>{{outlet}}');

      this.router.map(function () {
        this.route('posts');
      });

      this.add(
        'route:application',
        Route.extend({
          model() {
            return emberA();
          },
        })
      );

      return this.visit('/posts').then(() => {
        assert.ok(true, '/posts has been handled');
        let rootElement = document.getElementById('qunit-fixture');
        assert.equal(getTextOf(rootElement.querySelector('h3.render-once')), 'I render once');
      });
    }

    ['@test Child routes should render inside the application template if the application template causes a redirect'](
      assert
    ) {
      this.addTemplate('application', '<h3>App</h3> {{outlet}}');
      this.addTemplate('posts', 'posts');

      this.router.map(function () {
        this.route('posts');
        this.route('photos');
      });

      this.add(
        'route:application',
        Route.extend({
          afterModel() {
            expectDeprecation(() => {
              this.transitionTo('posts');
            }, /Calling transitionTo on a route is deprecated/);
          },
        })
      );

      return this.visit('/posts').then(() => {
        let rootElement = document.getElementById('qunit-fixture');
        assert.equal(rootElement.textContent.trim(), 'App posts');
      });
    }

    async ["@test The template is not re-rendered when the route's model changes"](assert) {
      this.router.map(function () {
        this.route('page', { path: '/page/:name' });
      });

      this.add(
        'route:page',
        Route.extend({
          model(params) {
            return EmberObject.create({ name: params.name });
          },
        })
      );

      let insertionCount = 0;
      this.add(
        'component:foo-bar',
        Component.extend({
          didInsertElement() {
            insertionCount += 1;
          },
        })
      );

      this.addTemplate('page', '<p>{{@model.name}}{{foo-bar}}</p>');

      let rootElement = document.getElementById('qunit-fixture');

      await this.visit('/page/first');

      assert.ok(true, '/page/first has been handled');
      assert.equal(getTextOf(rootElement.querySelector('p')), 'first');
      assert.equal(insertionCount, 1);

      await this.visit('/page/second');

      assert.ok(true, '/page/second has been handled');
      assert.equal(getTextOf(rootElement.querySelector('p')), 'second');
      assert.equal(insertionCount, 1, 'view should have inserted only once');
      let router = this.applicationInstance.lookup('router:main');

      await run(() => router.transitionTo('page', EmberObject.create({ name: 'third' })));

      assert.equal(getTextOf(rootElement.querySelector('p')), 'third');
      assert.equal(insertionCount, 1, 'view should still have inserted only once');
    }

    ['@test The template is not re-rendered when two routes present the exact same template & controller'](
      assert
    ) {
      expectDeprecation('Usage of `renderTemplate` is deprecated.');
      this.router.map(function () {
        this.route('first');
        this.route('second');
        this.route('third');
        this.route('fourth');
      });

      // Note add a component to test insertion

      let insertionCount = 0;
      this.add(
        'component:x-input',
        Component.extend({
          didInsertElement() {
            insertionCount += 1;
          },
        })
      );

      let SharedRoute = Route.extend({
        setupController() {
          this.controllerFor('shared').set('message', 'This is the ' + this.routeName + ' message');
        },

        renderTemplate() {
          expectDeprecation(
            () => this.render('shared', { controller: 'shared' }),
            /Usage of `render` is deprecated/
          );
        },
      });

      this.add('route:shared', SharedRoute);
      this.add('route:first', SharedRoute.extend());
      this.add('route:second', SharedRoute.extend());
      this.add('route:third', SharedRoute.extend());
      this.add('route:fourth', SharedRoute.extend());

      this.add('controller:shared', Controller.extend());

      this.addTemplate('shared', '<p>{{this.message}}{{x-input}}</p>');

      let rootElement = document.getElementById('qunit-fixture');
      return this.visit('/first')
        .then(() => {
          assert.ok(true, '/first has been handled');
          assert.equal(getTextOf(rootElement.querySelector('p')), 'This is the first message');
          assert.equal(insertionCount, 1, 'expected one assertion');
          return this.visit('/second');
        })
        .then(() => {
          assert.ok(true, '/second has been handled');
          assert.equal(getTextOf(rootElement.querySelector('p')), 'This is the second message');
          assert.equal(insertionCount, 1, 'expected one assertion');
          return run(() => {
            this.applicationInstance
              .lookup('router:main')
              .transitionTo('third')
              .then(
                function () {
                  assert.ok(true, 'expected transition');
                },
                function (reason) {
                  assert.ok(false, 'unexpected transition failure: ', QUnit.jsDump.parse(reason));
                }
              );
          });
        })
        .then(() => {
          assert.equal(getTextOf(rootElement.querySelector('p')), 'This is the third message');
          assert.equal(insertionCount, 1, 'expected one assertion');
          return this.visit('fourth');
        })
        .then(() => {
          assert.ok(true, '/fourth has been handled');
          assert.equal(insertionCount, 1, 'expected one assertion');
          assert.equal(getTextOf(rootElement.querySelector('p')), 'This is the fourth message');
        });
    }

    ['@test Route should tear down multiple outlets'](assert) {
      expectDeprecation('Usage of `renderTemplate` is deprecated.');
      this.addTemplate('application', "{{outlet 'menu'}}{{outlet}}{{outlet 'footer'}}");
      this.addTemplate('posts', '{{outlet}}');
      this.addTemplate('users', 'users');
      this.addTemplate('posts.index', '<p class="posts-index">postsIndex</p>');
      this.addTemplate('posts.menu', '<div class="posts-menu">postsMenu</div>');
      this.addTemplate('posts.footer', '<div class="posts-footer">postsFooter</div>');

      this.router.map(function () {
        this.route('posts', function () {});
        this.route('users', function () {});
      });

      this.add(
        'route:posts',
        Route.extend({
          renderTemplate() {
            expectDeprecation(() => {
              this.render('posts/menu', {
                into: 'application',
                outlet: 'menu',
              });

              this.render();

              this.render('posts/footer', {
                into: 'application',
                outlet: 'footer',
              });
            }, /Usage of `render` is deprecated/);
          },
        })
      );

      let rootElement = document.getElementById('qunit-fixture');
      return this.visit('/posts')
        .then(() => {
          assert.ok(true, '/posts has been handled');
          assert.equal(
            getTextOf(rootElement.querySelector('div.posts-menu')),
            'postsMenu',
            'The posts/menu template was rendered'
          );
          assert.equal(
            getTextOf(rootElement.querySelector('p.posts-index')),
            'postsIndex',
            'The posts/index template was rendered'
          );
          assert.equal(
            getTextOf(rootElement.querySelector('div.posts-footer')),
            'postsFooter',
            'The posts/footer template was rendered'
          );

          return this.visit('/users');
        })
        .then(() => {
          assert.ok(true, '/users has been handled');
          assert.equal(
            rootElement.querySelector('div.posts-menu'),
            null,
            'The posts/menu template was removed'
          );
          assert.equal(
            rootElement.querySelector('p.posts-index'),
            null,
            'The posts/index template was removed'
          );
          assert.equal(
            rootElement.querySelector('div.posts-footer'),
            null,
            'The posts/footer template was removed'
          );
        });
    }

    ['@test Route supports clearing outlet explicitly'](assert) {
      this.addTemplate('application', "{{outlet}}{{outlet 'modal'}}");
      this.addTemplate('posts', '{{outlet}}');
      this.addTemplate('users', 'users');
      this.addTemplate('posts.index', '<div class="posts-index">postsIndex {{outlet}}</div>');
      this.addTemplate('posts.modal', '<div class="posts-modal">postsModal</div>');
      this.addTemplate('posts.extra', '<div class="posts-extra">postsExtra</div>');

      this.router.map(function () {
        this.route('posts', function () {});
        this.route('users', function () {});
      });

      this.add(
        'route:posts',
        Route.extend({
          actions: {
            showModal() {
              expectDeprecation(() => {
                this.render('posts/modal', {
                  into: 'application',
                  outlet: 'modal',
                });
              }, /Usage of `render` is deprecated/);
            },
            hideModal() {
              expectDeprecation(
                () =>
                  this.disconnectOutlet({
                    outlet: 'modal',
                    parentView: 'application',
                  }),
                'The usage of `disconnectOutlet` is deprecated.'
              );
            },
          },
        })
      );

      this.add(
        'route:posts.index',
        Route.extend({
          actions: {
            showExtra() {
              expectDeprecation(() => {
                this.render('posts/extra', {
                  into: 'posts/index',
                });
              }, /Usage of `render` is deprecated/);
            },
            hideExtra() {
              expectDeprecation(
                () => this.disconnectOutlet({ parentView: 'posts/index' }),
                'The usage of `disconnectOutlet` is deprecated.'
              );
            },
          },
        })
      );

      let rootElement = document.getElementById('qunit-fixture');

      return this.visit('/posts')
        .then(() => {
          let router = this.applicationInstance.lookup('router:main');

          assert.equal(
            getTextOf(rootElement.querySelector('div.posts-index')),
            'postsIndex',
            'The posts/index template was rendered'
          );
          run(() => router.send('showModal'));
          assert.equal(
            getTextOf(rootElement.querySelector('div.posts-modal')),
            'postsModal',
            'The posts/modal template was rendered'
          );
          run(() => router.send('showExtra'));

          assert.equal(
            getTextOf(rootElement.querySelector('div.posts-extra')),
            'postsExtra',
            'The posts/extra template was rendered'
          );
          run(() => router.send('hideModal'));

          assert.equal(
            rootElement.querySelector('div.posts-modal'),
            null,
            'The posts/modal template was removed'
          );
          run(() => router.send('hideExtra'));

          assert.equal(
            rootElement.querySelector('div.posts-extra'),
            null,
            'The posts/extra template was removed'
          );
          run(function () {
            router.send('showModal');
          });
          assert.equal(
            getTextOf(rootElement.querySelector('div.posts-modal')),
            'postsModal',
            'The posts/modal template was rendered'
          );
          run(function () {
            router.send('showExtra');
          });
          assert.equal(
            getTextOf(rootElement.querySelector('div.posts-extra')),
            'postsExtra',
            'The posts/extra template was rendered'
          );
          return this.visit('/users');
        })
        .then(() => {
          assert.equal(
            rootElement.querySelector('div.posts-index'),
            null,
            'The posts/index template was removed'
          );
          assert.equal(
            rootElement.querySelector('div.posts-modal'),
            null,
            'The posts/modal template was removed'
          );
          assert.equal(
            rootElement.querySelector('div.posts-extra'),
            null,
            'The posts/extra template was removed'
          );
        });
    }

    ['@test Route supports clearing outlet using string parameter'](assert) {
      this.addTemplate('application', "{{outlet}}{{outlet 'modal'}}");
      this.addTemplate('posts', '{{outlet}}');
      this.addTemplate('users', 'users');
      this.addTemplate('posts.index', '<div class="posts-index">postsIndex {{outlet}}</div>');
      this.addTemplate('posts.modal', '<div class="posts-modal">postsModal</div>');

      this.router.map(function () {
        this.route('posts', function () {});
        this.route('users', function () {});
      });

      this.add(
        'route:posts',
        Route.extend({
          actions: {
            showModal() {
              expectDeprecation(() => {
                this.render('posts/modal', {
                  into: 'application',
                  outlet: 'modal',
                });
              }, /Usage of `render` is deprecated/);
            },
            hideModal() {
              expectDeprecation(
                () => this.disconnectOutlet('modal'),
                'The usage of `disconnectOutlet` is deprecated.'
              );
            },
          },
        })
      );

      let rootElement = document.getElementById('qunit-fixture');
      return this.visit('/posts')
        .then(() => {
          let router = this.applicationInstance.lookup('router:main');
          assert.equal(
            getTextOf(rootElement.querySelector('div.posts-index')),
            'postsIndex',
            'The posts/index template was rendered'
          );
          run(() => router.send('showModal'));
          assert.equal(
            getTextOf(rootElement.querySelector('div.posts-modal')),
            'postsModal',
            'The posts/modal template was rendered'
          );
          run(() => router.send('hideModal'));
          assert.equal(
            rootElement.querySelector('div.posts-modal'),
            null,
            'The posts/modal template was removed'
          );
          return this.visit('/users');
        })
        .then(() => {
          assert.equal(
            rootElement.querySelector('div.posts-index'),
            null,
            'The posts/index template was removed'
          );
          assert.equal(
            rootElement.querySelector('div.posts-modal'),
            null,
            'The posts/modal template was removed'
          );
        });
    }

    ['@test Route silently fails when cleaning an outlet from an inactive view'](assert) {
      assert.expect(4); // handleURL

      this.addTemplate('application', '{{outlet}}');
      this.addTemplate('posts', "{{outlet 'modal'}}");
      this.addTemplate('modal', 'A Yo.');

      this.router.map(function () {
        this.route('posts');
      });

      this.add(
        'route:posts',
        Route.extend({
          actions: {
            hideSelf() {
              expectDeprecation(
                () =>
                  this.disconnectOutlet({
                    outlet: 'main',
                    parentView: 'application',
                  }),
                'The usage of `disconnectOutlet` is deprecated.'
              );
            },
            showModal() {
              expectDeprecation(
                () => this.render('modal', { into: 'posts', outlet: 'modal' }),
                /Usage of `render` is deprecated/
              );
            },
            hideModal() {
              expectDeprecation(
                () => this.disconnectOutlet({ outlet: 'modal', parentView: 'posts' }),
                'The usage of `disconnectOutlet` is deprecated.'
              );
            },
          },
        })
      );

      return this.visit('/posts').then(() => {
        assert.ok(true, '/posts has been handled');
        let router = this.applicationInstance.lookup('router:main');
        run(() => router.send('showModal'));
        run(() => router.send('hideSelf'));
        run(() => router.send('hideModal'));
      });
    }

    ['@test Specifying non-existent controller name in route#render throws'](assert) {
      expectDeprecation(
        /(Usage of `renderTemplate` is deprecated|Usage of `render` is deprecated)/
      );
      assert.expect(2);

      this.router.map(function () {
        this.route('home', { path: '/' });
      });

      this.add(
        'route:home',
        Route.extend({
          renderTemplate() {
            expectAssertion(() => {
              this.render('homepage', {
                controller: 'stefanpenneristhemanforme',
              });
            }, "You passed `controller: 'stefanpenneristhemanforme'` into the `render` method, but no such controller could be found.");
          },
        })
      );

      return this.visit('/');
    }

    ['@test {{outlet}} works when created after initial render'](assert) {
      this.addTemplate('sample', 'Hi{{#if this.showTheThing}}{{outlet}}{{/if}}Bye');
      this.addTemplate('sample.inner', 'Yay');
      this.addTemplate('sample.inner2', 'Boo');
      this.router.map(function () {
        this.route('sample', { path: '/' }, function () {
          this.route('inner', { path: '/' });
          this.route('inner2', { path: '/2' });
        });
      });

      let rootElement;
      return this.visit('/')
        .then(() => {
          rootElement = document.getElementById('qunit-fixture');
          assert.equal(rootElement.textContent.trim(), 'HiBye', 'initial render');

          run(() => this.applicationInstance.lookup('controller:sample').set('showTheThing', true));

          assert.equal(rootElement.textContent.trim(), 'HiYayBye', 'second render');
          return this.visit('/2');
        })
        .then(() => {
          assert.equal(rootElement.textContent.trim(), 'HiBooBye', 'third render');
        });
    }

    ['@test Can render into a named outlet at the top level'](assert) {
      expectDeprecation('Usage of `renderTemplate` is deprecated.');
      this.addTemplate('application', 'A-{{outlet}}-B-{{outlet "other"}}-C');
      this.addTemplate('modal', 'Hello world');
      this.addTemplate('index', 'The index');
      this.router.map(function () {
        this.route('index', { path: '/' });
      });
      this.add(
        'route:application',
        Route.extend({
          renderTemplate() {
            expectDeprecation(() => {
              this.render();
              this.render('modal', {
                into: 'application',
                outlet: 'other',
              });
            }, /Usage of `render` is deprecated/);
          },
        })
      );

      return this.visit('/').then(() => {
        let rootElement = document.getElementById('qunit-fixture');
        assert.equal(
          rootElement.textContent.trim(),
          'A-The index-B-Hello world-C',
          'initial render'
        );
      });
    }

    ['@test Can disconnect a named outlet at the top level'](assert) {
      expectDeprecation('Usage of `renderTemplate` is deprecated.');
      this.addTemplate('application', 'A-{{outlet}}-B-{{outlet "other"}}-C');
      this.addTemplate('modal', 'Hello world');
      this.addTemplate('index', 'The index');
      this.router.map(function () {
        this.route('index', { path: '/' });
      });
      this.add(
        'route:application',
        Route.extend({
          renderTemplate() {
            expectDeprecation(() => {
              this.render();
              this.render('modal', {
                into: 'application',
                outlet: 'other',
              });
            }, /Usage of `render` is deprecated/);
          },
          actions: {
            banish() {
              expectDeprecation(
                () =>
                  this.disconnectOutlet({
                    parentView: 'application',
                    outlet: 'other',
                  }),
                'The usage of `disconnectOutlet` is deprecated.'
              );
            },
          },
        })
      );

      return this.visit('/').then(() => {
        let rootElement = document.getElementById('qunit-fixture');
        assert.equal(
          rootElement.textContent.trim(),
          'A-The index-B-Hello world-C',
          'initial render'
        );

        run(this.applicationInstance.lookup('router:main'), 'send', 'banish');

        assert.equal(rootElement.textContent.trim(), 'A-The index-B--C', 'second render');
      });
    }

    ['@test Can render into a named outlet at the top level, with empty main outlet'](assert) {
      expectDeprecation('Usage of `renderTemplate` is deprecated.');
      this.addTemplate('application', 'A-{{outlet}}-B-{{outlet "other"}}-C');
      this.addTemplate('modal', 'Hello world');

      this.router.map(function () {
        this.route('hasNoTemplate', { path: '/' });
      });

      this.add(
        'route:application',
        Route.extend({
          renderTemplate() {
            expectDeprecation(() => {
              this.render();
              this.render('modal', {
                into: 'application',
                outlet: 'other',
              });
            }, /Usage of `render` is deprecated/);
          },
        })
      );

      return this.visit('/').then(() => {
        let rootElement = document.getElementById('qunit-fixture');
        assert.equal(rootElement.textContent.trim(), 'A--B-Hello world-C', 'initial render');
      });
    }

    ['@test Can render into a named outlet at the top level, later'](assert) {
      this.addTemplate('application', 'A-{{outlet}}-B-{{outlet "other"}}-C');
      this.addTemplate('modal', 'Hello world');
      this.addTemplate('index', 'The index');
      this.router.map(function () {
        this.route('index', { path: '/' });
      });
      this.add(
        'route:application',
        Route.extend({
          actions: {
            launch() {
              expectDeprecation(() => {
                this.render('modal', {
                  into: 'application',
                  outlet: 'other',
                });
              }, /Usage of `render` is deprecated/);
            },
          },
        })
      );

      return this.visit('/').then(() => {
        let rootElement = document.getElementById('qunit-fixture');
        assert.equal(rootElement.textContent.trim(), 'A-The index-B--C', 'initial render');
        run(this.applicationInstance.lookup('router:main'), 'send', 'launch');
        assert.equal(
          rootElement.textContent.trim(),
          'A-The index-B-Hello world-C',
          'second render'
        );
      });
    }

    ["@test Can render routes with no 'main' outlet and their children"](assert) {
      expectDeprecation('Usage of `renderTemplate` is deprecated.');
      this.addTemplate('application', '<div id="application">{{outlet "app"}}</div>');
      this.addTemplate(
        'app',
        '<div id="app-common">{{outlet "common"}}</div><div id="app-sub">{{outlet "sub"}}</div>'
      );
      this.addTemplate('common', '<div id="common"></div>');
      this.addTemplate('sub', '<div id="sub"></div>');

      this.router.map(function () {
        this.route('app', { path: '/app' }, function () {
          this.route('sub', { path: '/sub', resetNamespace: true });
        });
      });

      this.add(
        'route:app',
        Route.extend({
          renderTemplate() {
            expectDeprecation(() => {
              this.render('app', {
                outlet: 'app',
                into: 'application',
              });
              this.render('common', {
                outlet: 'common',
                into: 'app',
              });
            }, /Usage of `render` is deprecated/);
          },
        })
      );

      this.add(
        'route:sub',
        Route.extend({
          renderTemplate() {
            expectDeprecation(() => {
              this.render('sub', {
                outlet: 'sub',
                into: 'app',
              });
            }, /Usage of `render` is deprecated/);
          },
        })
      );

      let rootElement;
      return this.visit('/app')
        .then(() => {
          rootElement = document.getElementById('qunit-fixture');
          assert.equal(
            rootElement.querySelectorAll('#app-common #common').length,
            1,
            'Finds common while viewing /app'
          );
          return this.visit('/app/sub');
        })
        .then(() => {
          assert.equal(
            rootElement.querySelectorAll('#app-common #common').length,
            1,
            'Finds common while viewing /app/sub'
          );
          assert.equal(
            rootElement.querySelectorAll('#app-sub #sub').length,
            1,
            'Finds sub while viewing /app/sub'
          );
        });
    }

    ['@test Tolerates stacked renders'](assert) {
      this.addTemplate('application', '{{outlet}}{{outlet "modal"}}');
      this.addTemplate('index', 'hi');
      this.addTemplate('layer', 'layer');
      this.router.map(function () {
        this.route('index', { path: '/' });
      });
      this.add(
        'route:application',
        Route.extend({
          actions: {
            openLayer() {
              expectDeprecation(() => {
                this.render('layer', {
                  into: 'application',
                  outlet: 'modal',
                });
              }, /Usage of `render` is deprecated/);
            },
            close() {
              expectDeprecation(
                () =>
                  this.disconnectOutlet({
                    outlet: 'modal',
                    parentView: 'application',
                  }),
                'The usage of `disconnectOutlet` is deprecated.'
              );
            },
          },
        })
      );

      return this.visit('/').then(() => {
        let rootElement = document.getElementById('qunit-fixture');
        let router = this.applicationInstance.lookup('router:main');
        assert.equal(rootElement.textContent.trim(), 'hi');
        run(router, 'send', 'openLayer');
        assert.equal(rootElement.textContent.trim(), 'hilayer');
        run(router, 'send', 'openLayer');
        assert.equal(rootElement.textContent.trim(), 'hilayer');
        run(router, 'send', 'close');
        assert.equal(rootElement.textContent.trim(), 'hi');
      });
    }

    ['@test Renders child into parent with non-default template name'](assert) {
      expectDeprecation('Usage of `renderTemplate` is deprecated.');
      this.addTemplate('application', '<div class="a">{{outlet}}</div>');
      this.addTemplate('exports.root', '<div class="b">{{outlet}}</div>');
      this.addTemplate('exports.index', '<div class="c"></div>');

      this.router.map(function () {
        this.route('root', function () {});
      });

      this.add(
        'route:root',
        Route.extend({
          renderTemplate() {
            expectDeprecation(() => this.render('exports/root'), /Usage of `render` is deprecated/);
          },
        })
      );

      this.add(
        'route:root.index',
        Route.extend({
          renderTemplate() {
            expectDeprecation(
              () => this.render('exports/index'),
              /Usage of `render` is deprecated/
            );
          },
        })
      );

      return this.visit('/root').then(() => {
        let rootElement = document.getElementById('qunit-fixture');
        assert.equal(rootElement.querySelectorAll('.a .b .c').length, 1);
      });
    }

    ["@test Allows any route to disconnectOutlet another route's templates"](assert) {
      this.addTemplate('application', '{{outlet}}{{outlet "modal"}}');
      this.addTemplate('index', 'hi');
      this.addTemplate('layer', 'layer');
      this.router.map(function () {
        this.route('index', { path: '/' });
      });
      this.add(
        'route:application',
        Route.extend({
          actions: {
            openLayer() {
              expectDeprecation(() => {
                this.render('layer', {
                  into: 'application',
                  outlet: 'modal',
                });
              }, /Usage of `render` is deprecated/);
            },
          },
        })
      );
      this.add(
        'route:index',
        Route.extend({
          actions: {
            close() {
              expectDeprecation(
                () =>
                  this.disconnectOutlet({
                    parentView: 'application',
                    outlet: 'modal',
                  }),
                'The usage of `disconnectOutlet` is deprecated.'
              );
            },
          },
        })
      );

      return this.visit('/').then(() => {
        let rootElement = document.getElementById('qunit-fixture');
        let router = this.applicationInstance.lookup('router:main');
        assert.equal(rootElement.textContent.trim(), 'hi');
        run(router, 'send', 'openLayer');
        assert.equal(rootElement.textContent.trim(), 'hilayer');
        run(router, 'send', 'close');
        assert.equal(rootElement.textContent.trim(), 'hi');
      });
    }

    ['@test Components inside an outlet have their didInsertElement hook invoked when the route is displayed'](
      assert
    ) {
      this.addTemplate(
        'index',
        '{{#if this.showFirst}}{{my-component}}{{else}}{{other-component}}{{/if}}'
      );

      let myComponentCounter = 0;
      let otherComponentCounter = 0;
      let indexController;

      this.router.map(function () {
        this.route('index', { path: '/' });
      });

      this.add(
        'controller:index',
        Controller.extend({
          showFirst: true,
        })
      );

      this.add(
        'route:index',
        Route.extend({
          setupController(controller) {
            indexController = controller;
          },
        })
      );

      this.add(
        'component:my-component',
        Component.extend({
          didInsertElement() {
            myComponentCounter++;
          },
        })
      );

      this.add(
        'component:other-component',
        Component.extend({
          didInsertElement() {
            otherComponentCounter++;
          },
        })
      );

      return this.visit('/').then(() => {
        assert.strictEqual(
          myComponentCounter,
          1,
          'didInsertElement invoked on displayed component'
        );
        assert.strictEqual(
          otherComponentCounter,
          0,
          'didInsertElement not invoked on displayed component'
        );

        run(() => indexController.set('showFirst', false));

        assert.strictEqual(
          myComponentCounter,
          1,
          'didInsertElement not invoked on displayed component'
        );
        assert.strictEqual(
          otherComponentCounter,
          1,
          'didInsertElement invoked on displayed component'
        );
      });
    }

    ['@test Exception if outlet name is undefined in render and disconnectOutlet']() {
      this.add(
        'route:application',
        Route.extend({
          actions: {
            showModal() {
              expectDeprecation(() => {
                this.render({
                  outlet: undefined,
                  parentView: 'application',
                });
              }, /Usage of `render` is deprecated/);
            },
            hideModal() {
              expectDeprecation(
                () =>
                  this.disconnectOutlet({
                    outlet: undefined,
                    parentView: 'application',
                  }),
                'The usage of `disconnectOutlet` is deprecated.'
              );
            },
          },
        })
      );

      return this.visit('/').then(() => {
        let router = this.applicationInstance.lookup('router:main');
        expectAssertion(() => {
          run(() => router.send('showModal'));
        }, /You passed undefined as the outlet name/);

        expectAssertion(() => {
          run(() => router.send('hideModal'));
        }, /You passed undefined as the outlet name/);
      });
    }
  }
);
