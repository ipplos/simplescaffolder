#!/usr/bin/env node

console.log('Simple Scaffolder Ver 1.0');

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
console.log("\n== USER INPUT ===========================================================\n");
// Get user input for the scaffolder's inputs
var inputContext = {};
for (var i = 0; i < scaffolder.inputs.length; i++) {
	var questionString = scaffolder.inputs[i].description + '(' + scaffolder.inputs[i].varname + '): ';

	var defaultValue = getValueWithReplacement(inputContext, scaffolder.inputs[i].default);
	if (defaultValue)
		questionString += '(def: ' + defaultValue + ')';


	inputContext[scaffolder.inputs[i].varname] = readlineSync.question(questionString);
	if (!inputContext[scaffolder.inputs[i].varname] && defaultValue) {
		inputContext[scaffolder.inputs[i].varname] = defaultValue
	}
}
console.log("\n== TEMPLATE EXECUTION ==================================================");
// Execute the scaffolder's tasks
for (var i = 0; i < scaffolder.tasks.length; i++) {
	console.log("\n== "+i.toString()+" =======================================================");
	console.log("Working with template file: \n" + getValueWithReplacement(context, scaffolder.tasks[i].templateFile));
	var contextFile = getValueWithReplacement(inputContext, scaffolder.tasks[i].context);
	var context = {};
	if (contextFile)
		context = JSON.parse(fs.readFileSync(contextFile).toString());
	else
		console.log("Context file: " + getValueWithReplacement(inputContext, scaffolder.tasks[i].context) + " not found!");

	for (var j = 0; j < scaffolder.inputs.length; j++)
		context[scaffolder.inputs[j].varname] = inputContext[scaffolder.inputs[j].varname];
	console.log("-----------------------------------------------------------------");
	console.log("Context for template is:");
	console.log(context);
	console.log("-----------------------------------------------------------------");

    var templateFile = getValueWithReplacement(context,scaffolder.tasks[i].templateFile);
    var targetFolder = getValueWithReplacement(context,scaffolder.tasks[i].targetFolder);
    var filename = getValueWithReplacement(context,scaffolder.tasks[i].filename);
    var extension = getValueWithReplacement(context,scaffolder.tasks[i].extension);
	
	console.log("targetFolder: " + targetFolder);
	console.log("filename: " + filename);
	console.log("extension: " + extension);
	console.log("------------------------------------------------------------------");

    var template = fs.readFileSync(templateFile,'utf8').toString();
    var fileContentsToWrite = "";
	if (templateFile.indexOf("handlebars") != -1) {
		console.log("Using Handlebars...");
        var hbTemplate = hb.compile(template);
        fileContentsToWrite = hbTemplate(context).replace(/^\s*\n/gm, '').replace(/~\s*/g, '');
    }

	if (templateFile.indexOf("ejs") != -1) {
		console.log("Using ejs...");
        fileContentsToWrite = ejs.render(template, context).replace(/^\s*\n/gm, '').replace(/~\s*/g, '');
	}
	console.log("File contents created.");
	ensureDirectoryExistence(targetFolder + filename + extension);
	console.log("Writing contents to: "+ targetFolder + filename + extension);
	fs.writeFileSync(targetFolder + filename + extension, fileContentsToWrite);
	console.log("File generation ended.");
}
