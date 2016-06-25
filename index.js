#!/usr/bin/env node

var hb = require('handlebars');
hb.registerHelper('ifCond', function (v1, operator, v2, options) {
    
    switch (operator) {
        case '==':
            return (v1 == v2) ? options.fn(this) : options.inverse(this);
        case '===':
            return (v1 === v2) ? options.fn(this) : options.inverse(this);
        case '<':
            return (v1 < v2) ? options.fn(this) : options.inverse(this);
        case '<=':
            return (v1 <= v2) ? options.fn(this) : options.inverse(this);
        case '>':
            return (v1 > v2) ? options.fn(this) : options.inverse(this);
        case '>=':
            return (v1 >= v2) ? options.fn(this) : options.inverse(this);
        case '&&':
            return (v1 && v2) ? options.fn(this) : options.inverse(this);
        case '||':
            return (v1 || v2) ? options.fn(this) : options.inverse(this);
        default:
            return options.inverse(this);
    }
});

var ejs = require('ejs');

var fs = require('fs');
var mkdirp = require('mkdirp');
var underscore = require('underscore');
var readlineSync = require('readline-sync');
var path = require('path');

var ensureDirectoryExistence=function (filePath) {
    var dirname = path.dirname(filePath);
    if (directoryExists(dirname)) {
        return true;
    }
    ensureDirectoryExistence(dirname);
    fs.mkdirSync(dirname);
}
var directoryExists=function (path) {
    try {
        return fs.statSync(path).isDirectory();
    }
  catch (err) {
        return false;
    }
}
var getValueWithReplacement = function (inputContext, value){
    if (!value) return value;

    var re = /%%.*%%/;
    var matchedWords = value.match(re);
    if (!matchedWords) return value;

    for (var i = 0; i < matchedWords.length; i++) {
        value=value.replace(matchedWords[i], inputContext[matchedWords[i].replace(/%%/g, '')]);
    }
    return value;
}

var configFilename = process.argv[2];       // eg. This is the filename containing the configuration information of the scaffolder(s)
var scaffolderName = process.argv[3];       // The scaffolder's name to be used (Must exist in the configuration file)

// Read the conifguration file
var configData = fs.readFileSync(configFilename);
if (!configData) {
    console.log('Configuration file ' + configFilename + ' could not be located.');
    return;
}
var config = JSON.parse(configData.toString());

// Read the scaffolder's data
var scaffolder = config[scaffolderName];
if (scaffolder == undefined) {
    console.log('Scaffolder\'s name '+ scaffolderName+' was not found in ' + configFilename + ' file');
    return;
}

// Get user input for the scaffolder's inputs
var inputContext = {};
for (var i = 0; i < scaffolder.inputs.length; i++) {
    inputContext[scaffolder.inputs[i].varname] = readlineSync.question(scaffolder.inputs[i].description+'(' + scaffolder.inputs[i].varname + '): ');
}

// Execute the scaffolder's tasks
for (var i = 0; i < scaffolder.tasks.length; i++) {
    var templateFile = getValueWithReplacement(inputContext,scaffolder.tasks[i].templateFile);
    var contextFile = getValueWithReplacement(inputContext,scaffolder.tasks[i].context);
    var targetFolder = getValueWithReplacement(inputContext,scaffolder.tasks[i].targetFolder);
    var filename = getValueWithReplacement(inputContext,scaffolder.tasks[i].filename);
    var extension = getValueWithReplacement(inputContext,scaffolder.tasks[i].extension);
    
    var context = {};
    if (contextFile)
        context = JSON.parse(fs.readFileSync(contextFile).toString());
    
    for (var j = 0; j < scaffolder.inputs.length; j++)
        context[scaffolder.inputs[j].varname] = inputContext[scaffolder.inputs[j].varname];
    
    var template = fs.readFileSync(templateFile).toString();
    var fileContentsToWrite = "";
    if (templateFile.indexOf("handlebars") != -1) {
        var hbTemplate = hb.compile(template);
        fileContentsToWrite = hbTemplate(context).replace(/^\s*\n/gm, '').replace(/~\s*/g, '');
    }
    
    if (templateFile.indexOf("ejs") != -1) {
        fileContentsToWrite = ejs.render(template, context).replace(/^\s*\n/gm, '').replace(/~\s*/g, '');
    }
    ensureDirectoryExistence(targetFolder + filename + extension);
    fs.writeFileSync(targetFolder + filename + extension, fileContentsToWrite);
}


