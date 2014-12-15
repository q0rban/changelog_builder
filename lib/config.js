var nconf = require('nconf');
var _ = require('lodash');

var items = {
  'githubToken': {
    'label': 'Github Token',
    'description': 'The token to use to make requests to Github with.',
    'prompt': false
  },
  'repoName': {
    'label': 'Repository Name',
    'description': 'The machine name of the repository on Github.'
  },
  'repoUser': {
    'label': 'Repository User',
    'description': 'The user that owns the repository on Github, e.g. NBCUOTS.'
  }
}

nconf.defaults({
  'configPath': __dirname + '/../.config'
});

nconf.argv()
  .env()
  .file({ file: nconf.get('configPath') });

function Config() {
  nconf.file(nconf.get('configPath'));
};

Config.prototype.check = function() {
  var config = this;
  var configured = true;
  _.forEach(items, function(item, key) {
    if (!config.get(key)) {
      configured = false;
      console.error('%s is not set.', item.label);
    }
  });
  return configured;
};

Config.prototype.setup = function(quiet) {
  var config = this;
  var prompt = require('prompt');
  var github = require('./github');
  
  if (this.get('githubToken')) {
    if (!quiet) {
      console.log('Already configured.');
    }
    process.exit();
  }

  var prompts = [
    {
      name: 'repoName',
      description: 'Github Repository',
      default: this.get('repoName'),
      required: true
    },
    {
      name: 'repoUser',
      description: 'Github User, e.g. NBCUOTS',
      default: this.get('githubUser'),
      required: true
    },
    {
      name: 'username',
      description: 'Github Username',
      required: true
    },
    {
      name: 'password',
      description: 'Github Password',
      hidden: true
    }
  ];

  prompt.colors = false;
  prompt.message = 'Prompt';

  prompt.get(prompts, function (promptError, promptResult) {
    if (promptError) {
      console.error(promptError);
      process.exit(1);
    }
    github.authenticate({
      type: 'basic',
      username: promptResult.username,
      password: promptResult.password
    });
    var msg = {
      scopes: ['repo'],
      note: 'changelog_builder',
      signature: 'changelog_builder'
    };
    config.set('repoUser', promptResult.repoUser);
    config.set('repoName', promptResult.repoName);
    github.authorization.create(msg, function (error, result) {
      if (error) {
        console.error(error);
        process.exit(1);
      }
      if (_.isUndefined(result.token) || !result.token) {
        console.error('Unable to retrieve token.');
        process.exit(1);
      }
      config.set('githubToken', result.token);
      console.log('Github OAuth token acquired.');
    });
  });
};

Config.prototype.get = function(name) {
  return nconf.get(name);
};

Config.prototype.set = function(name, value, callback) {
  nconf.set(name, value);
  return this.save(callback);
};

Config.prototype.save = function(callback) {
  return nconf.save(callback);
};

module.exports = new Config();
