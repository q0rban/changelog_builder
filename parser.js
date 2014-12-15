var github = require('./lib/github');
var config = require('./lib/config');
var _ = require('lodash');
var program = require('commander');

var msg = {
  "user": "NBCUOTS",
  "repo": "Publisher7_syfy"
};

var issues = [];
var regExp = /(?:\s|^|\[)#([0-9]{2,})\b/g;

function createChangelog(log) {
  log.split("\n").forEach(function (commit) {
    match = regExp.exec(commit);
    // Iterate over all matches. match[1] would hold just our issue number.
    while (match && !_.isUndefined(match[1])) {
      var issueNumber = match[1];
      // If this issueNumber isn't in our array, then we look it up and print
      // out the title.
      if (_.indexOf(issues, issueNumber) === -1) {
        // Store the issue in our array.
        issues.push(issueNumber);
        msg.number = issueNumber;
        // Look up the issue on github.
        github.issues.getRepoIssue(msg, function (error, result) {
          if (error) {
            console.error(error);
          }
          if (_.isUndefined(result.title)) {
            console.error("Unable to find title for issue %d", issueNumber)
          }
          else {
            console.log("* [#%d](%s) %s", issueNumber, result.html_url, result.title);
          }
        });
      }
      match = regExp.exec(commit);
    }
  });
}

program
  .version('0.0.1')
  .usage('./changelog [starting-tag] [ending-tag]');

program
  .command('setup')
  .option('-q, --quiet', 'Only display output if setup is needed.')
  .description('Setup the configuration for the changelog builder, including obtaining a Github OAuth token.')
  .action(function () {
    config.setup(this.quiet);
  });

program
  .command('parse')
  .description('Parse a console log from stdin, sniffing for issue numbers in the form of #123.')
  .action(function () {
    if (!config.check()) {
      process.exit(1);
    }

    github.authenticate({
      'type': 'token',
      'token': config.get('githubToken')
    });

    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', function(data) {
      createChangelog.call(program, data);
    });
  });

program.on('--help', function(){
  console.log('  Examples:');
  console.log('');
  console.log('    $ ./changelog 1.0        Show a changelog of all issues since the 1.0 tag.');
  console.log('    $ ./changelog 1.0 1.1    Show a changelog of all issues between 1.0 and 1.1.');
  console.log('');
});

program.parse(process.argv);

// Display help if no arguments were specified.
if (!program.args.length) {
  program.help();
}

