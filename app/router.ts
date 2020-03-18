import EmberRouter from '@ember/routing/router';
import config from 'ember-d3-demo/config/environment';

export default class Router extends EmberRouter {
  location = config.locationType;
  rootURL = config.rootURL;
}

Router.map(function() {
  this.route('d3', function() {
    this.route('hello');
  });
  this.route('show')
});
