#!/usr/bin/env node
var TAB="  ";
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

var usersManual=function(message){
  if (message)
    console.log(message);

  console.log("");
  console.log ("Simple Scaffolder Ver 2.0");
  console.log ("Ioannis Panagopoulos");
  console.log("");
  console.log ("Usage:\r\n");
  console.log ("simplescaffolder <configfile> <scaffolder> <?jobid>\r\n");
  console.log("<configfile>: The path to the configuration file");
  console.log("<scaffolder>:The name of the scaffodler to use within the configuration file");
  console.log("<jobid>: OPTIONAL The job within the scaffolder to execute task/replacer");
  console.log("\r\n");
  console.log("Have a nice day")
}
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
var getValueWithReplacement = function (valueContext, value,tab,silence){
    if (!tab) tab="";
    if (!value) return value;
    var re = /%%[^%]*%%/g;
    var matchedWords = value.match(re);
    if (!matchedWords) return value;
    for (var i = 0; i < matchedWords.length; i++) {
      var logMessage="Matched: "+matchedWords[i];
  		if (value.indexOf("LOWER") != -1) {
        logMessage+=" replacing with: "+valueContext[matchedWords[i].replace(/LOWER/g, '').replace(/%%/g, '')].toLowerCase();
  			value = value.replace(matchedWords[i], valueContext[matchedWords[i].replace(/LOWER/g, '').replace(/%%/g, '')].toLowerCase());
  		}
  		else {
        logMessage+=" replacing with: "+valueContext[matchedWords[i].replace(/%%/g, '')];
  			value = value.replace(matchedWords[i], valueContext[matchedWords[i].replace(/%%/g, '')]);
  		}
      if (!silence)
        console.log(tab+logMessage);
    }
    return value;
}

var configFilename = process.argv[2];       // eg. This is the filename containing the configuration information of the scaffolder(s)
var scaffolderName = process.argv[3];       // The scaffolder's name to be used (Must exist in the configuration file)
var jobName=process.argv[4];

// Read the conifguration file
var configData;
try{configData= fs.readFileSync(configFilename);}catch(e){}

if (!configData) {
    usersManual('Configuration file: ' + configFilename + ' could not be located.');
    return;
}

if (!scaffolderName){
  usersManual('Scaffolder\'s name not provided');
  return;
}

try {config= JSON.parse(configData.toString());}catch(e){usersManual("Error in configuration data: "+e.message);return;};

if (!config){
  usersManual('Configuration data could not be loaded or configuration file is empty');
  return;
}

// Read the scaffolder's data
var scaffolder = config[scaffolderName];
if (scaffolder == undefined) {
    usersManual('Scaffolder\'s name '+ scaffolderName+' was not found in ' + configFilename + ' file');
    return;
}

console.log("\nGetting User Input\n");
// Get user input for the scaffolder's inputs
var inputContext = {};
for (var i = 0; i < scaffolder.inputs.length; i++) {
	var questionString = scaffolder.inputs[i].description + '(' + scaffolder.inputs[i].varname + '): ';
	var defaultValue = getValueWithReplacement(inputContext, scaffolder.inputs[i].default,TAB+TAB);
	if (defaultValue) questionString += '(def: ' + defaultValue + ')';

	inputContext[scaffolder.inputs[i].varname] = readlineSync.question(TAB+questionString);
	if (!inputContext[scaffolder.inputs[i].varname] && defaultValue) {
		inputContext[scaffolder.inputs[i].varname] = defaultValue
	}
}

if (scaffolder.replacers!=undefined){
  console.log ("\nFound "+scaffolder.replacers.length+" replacers");
  if (jobName)
    console.log ("Looking for replacers with id: "+jobName);
  console.log ("Executing Replacers\n");
  for (var i = 0; i < scaffolder.replacers.length; i++) {
    if (jobName!="" && jobName!=undefined && jobName!=scaffolder.replacers[i].id)
      continue;

    if (jobName)
      console.log(TAB+"Found replacer with id: "+jobName);

    console.log(TAB+"Executing replacer with idx: "+i.toString()+" id: "+(scaffolder.replacers[i].id?scaffolder.replacers[i].id:"-"));
    var replacer=scaffolder.replacers[i];
    var context = {};
    if (replacer.context){
      var contextFile ="";
      contextFile = getValueWithReplacement(inputContext, replacer.context,'',true);
      console.log(TAB+"Replacer has context file: "+contextFile);

  		try
      {
        context = JSON.parse(fs.readFileSync(contextFile).toString());
      }
      catch(e)
      {
        console.log(TAB+TAB+"Context file loading or parsing failed: "+e.message);
        return;
      }
    }
    else{
      console.log(TAB+"Replacer has no context file");
    }

  	for (var j = 0; j < scaffolder.inputs.length; j++)
  		context[scaffolder.inputs[j].varname] = inputContext[scaffolder.inputs[j].varname];

    console.log(TAB+"Reading file: "+getValueWithReplacement(inputContext, replacer.targetFile,"",true));

    var fileContents;
    try
    {
      fileContents=fs.readFileSync(getValueWithReplacement(inputContext, replacer.targetFile,"",true)).toString();
    }
    catch(e){
      console.log(TAB+TAB+"Failed to load file");
      return;
    }
    for (var j=0;j<replacer.reps.length;j++){
      fileContents=fileContents.replace(replacer.reps[j].replacementLiteral,getValueWithReplacement(context,replacer.reps[j].replacer,TAB+TAB)+"\r\n"+replacer.reps[j].replacementLiteral);
    }
    console.log(TAB+"Writing file: "+getValueWithReplacement(inputContext, replacer.targetFile,"",true));
    try{
      fs.writeFileSync(replacer.targetFile, fileContents);
    }
    catch(e){
      console.log(TAB+TAB+"Write failed");
      return;
    }
  }
}

if (scaffolder.tasks){
  console.log ("\nFound "+scaffolder.tasks.length+" tasks");
  if (jobName)
    console.log ("Looking for tasks with id: "+jobName);
  console.log ("Executing Tasks\n");

  for (var i = 0; i < scaffolder.tasks.length; i++) {
    if (jobName!="" && jobName!=undefined && jobName!=scaffolder.tasks[i].id)
      continue;
    if (jobName)
      console.log(TAB+"Found task with id: "+jobName);

    console.log(TAB+"Executing task with idx: "+i.toString()+" id: "+(scaffolder.tasks[i].id?scaffolder.tasks[i].id:"-"));

  	console.log(TAB+"Will be working with template file: " + getValueWithReplacement(context, scaffolder.tasks[i].templateFile,'',true));
  	var contextFile = getValueWithReplacement(inputContext, scaffolder.tasks[i].context,TAB+TAB,true);

  	var context = {};
  	if (contextFile){
      console.log(TAB+"Will be working with context file: " + contextFile);
  		try{context = JSON.parse(fs.readFileSync(contextFile).toString());}
      catch(e){
        console.log(TAB+TAB+"Error loading/parsing context file: "+e.message);
        return;
      }
    }
  	else
  		console.log(TAB+"Context file not provided");

  	for (var j = 0; j < scaffolder.inputs.length; j++)
  		context[scaffolder.inputs[j].varname] = inputContext[scaffolder.inputs[j].varname];

  	// if (scaffolder.tasks[i].extraContexts != undefined) {
  	// 	for (var k = 0; k < scaffolder.tasks[i].extraContexts.length; k++) {
  	// 		var extraContext = getValueWithReplacement(inputContext, scaffolder.tasks[i].extraContexts[k],'',true);
  	// 		context[extraContext.name] = extraContext.value;
  	// 		for (var j = 0; j < scaffolder.inputs.length; j++)
  	// 			context[extraContext.name][scaffolder.inputs[j].varname] = inputContext[scaffolder.inputs[j].varname];
  	// 	}
  	// }

    var templateFile = getValueWithReplacement(context,scaffolder.tasks[i].templateFile,'',true);
    var targetFolder = getValueWithReplacement(context,scaffolder.tasks[i].targetFolder,'',true);
    var filename = getValueWithReplacement(context,scaffolder.tasks[i].filename,'',true);
    var extension = getValueWithReplacement(context,scaffolder.tasks[i].extension,'',true);

  	console.log(TAB+"Will write result to: " + targetFolder + filename + extension);

    var template;

    try{template= fs.readFileSync(templateFile,'utf8').toString();}
    catch(e){console.log(TAB+"Error in loading template file: "+templateFile); return;}

    var fileContentsToWrite = "";
  	if (templateFile.indexOf("handlebars") != -1) {
  		console.log(TAB+"Using Handlebars...");
      var hbTemplate = hb.compile(template);
      fileContentsToWrite = hbTemplate(context).replace(/^\s*\n/gm, '').replace(/~\s*/g, '');
    }

  	if (templateFile.indexOf("ejs") != -1) {
  		console.log(TAB+"Using ejs...");
      fileContentsToWrite = ejs.render(template, context).replace(/^\s*\n/gm, '');
  	}

  	console.log(TAB+"File contents created.");
  	ensureDirectoryExistence(targetFolder + filename + extension);
  	console.log(TAB+"Writing contents to: "+ targetFolder + filename + extension);
  	fs.writeFileSync(targetFolder + filename + extension, fileContentsToWrite);
  	console.log(TAB+"File generation ended.");
  }
}
