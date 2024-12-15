#!/usr/bin/env ts-node

import { dump, load } from "js-yaml";
import fs from "fs";
import path from "path";

import { Command } from "commander";
import {
  makeAutogradingReporter,
  makeCheckoutStep,
  makeStep,
  TestSpec,
} from "./genHomeworkWorkflow";

const program = new Command();
program
  .name("gen-homework-workflow")
  .description(
    "create Github Classroom autograding workflow based on a simple JSON spec"
  )
  .requiredOption(
    "-i | --input <jsonFile>",
    'Input JSON file with format [ {testName: "someTest", points: 10}, {testName: "anotherTest", points: 10}, ... ]'
  )
  .requiredOption(
    "-o | --output <yamlFile>",
    "Output YAML file suitable for copy/paste into Github Classroom"
  )
  .action((_name, options) => {
    console.log("Full options:");
    // console.log(JSON.stringify(options, null, 4));
    // console.log(options.getOptionValue("input"));
    const inFile = options.getOptionValue("input");
    const outFile = options.getOptionValue("output");
    console.log("in/out files:", inFile, outFile);
    const filePath = path.join(process.cwd(), inFile);
    if (!fs.existsSync(filePath)) {
      console.error(`Error: File not found: ${filePath}`);
      process.exit(1);
    }

    const homeworkSpecString = fs.readFileSync(filePath, "utf8");
    const homeworkSpecs: TestSpec[] = JSON.parse(homeworkSpecString);
    const templatePath = path.join(__dirname, "..", "template.yml");
    const doc = load(fs.readFileSync(templatePath, "utf8"));

    const steps = homeworkSpecs.map((spec) => makeStep(spec));
    const autogradeStep = makeAutogradingReporter(homeworkSpecs);

    doc["jobs"]["run-autograding-tests"]["steps"] = [
      makeCheckoutStep(),
      ...steps,
      autogradeStep,
    ];

    const inYaml = dump(doc);
    const outFilePath = path.join(process.cwd(), outFile);
    fs.writeFile(outFilePath, inYaml, (err) => {
      if (err) {
        console.error(err);
      } else {
        console.log("File written successfully!");
      }
    });
  })
  .parse(process.argv);

// program.parse(process.argv);
// program.parse();
