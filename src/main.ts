import { dump, load } from "js-yaml";
import fs from "fs";
import path from "path";
import { kebabCase } from "lodash";

const fileName = process.argv[2];
console.log("file name:", fileName);
const filePath = path.join(process.cwd(), fileName);

if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

type TestSpec = {
  testName: string;
  points: number;
};
const homeworkSpecString = fs.readFileSync(filePath, "utf8");
const homeworkSpecs: TestSpec[] = JSON.parse(homeworkSpecString);
console.log(`Found homework file with ${homeworkSpecs.length} entries`);

const doc = load(fs.readFileSync("./template.yml", "utf8"));
console.log("Loaded yaml template");

type Names = {
  human: string;
  npm: string;
  kebab: string;
  env: string;
};

const toHuman = (functionName: string): string => {
  return kebabCase(functionName) // initTest -> init-test
    .replace("-", " ") // init-test -> init test
    .replace(
      // init test -> Init Test
      /\w\S*/g, // grab words
      (text) => {
        return (
          text.charAt(0).toUpperCase() + // upper case first letter
          text.substring(1).toLowerCase() // copy remainder of word
        );
      }
    );
};

const getNames = (functionName: string): Names => {
  return {
    human: toHuman(functionName),
    npm: functionName,
    kebab: kebabCase(functionName),
    env: kebabCase(functionName).toUpperCase(),
  };
};

const makeCheckoutStep = () => {
  return {
    name: "Checkout code",
    uses: "actions/checkout@v4",
  };
};

const makeStep = ({ testName, points }: TestSpec) => {
  const names = getNames(testName);
  const ret = {
    name: names.human,
    id: names.kebab,
    uses: "classroom-resources/autograding-command-grader@v1",
    with: {
      "test-name": names.human,
      "setup-command": "npm install",
      command: `npm test ${names.npm}`,
      timeout: 10,
      "max-score": points,
    },
  };
  return ret;
};

const makeEnvObject = (allNames: Names[]): object => {
  const ret = Object.fromEntries(
    allNames.map((names) => [
      `${names.env}_RESULTS`,
      `\${{steps.${names.kebab}.outputs.result}}` as string,
    ])
  );
  return ret;
};
/*
{
    "name": "Autograding Reporter",
    "uses": "classroom-resources/autograding-grading-reporter@v1",
    "env": {
        "SANITY_RESULTS": "${{steps.sanity.outputs.result}}",
        "INIT-LIST_RESULTS": "${{steps.init-list.outputs.result}}",
        "APPEND_RESULTS": "${{steps.append.outputs.result}}",
        "CONTAINS-VALUE_RESULTS": "${{steps.contains-value.outputs.result}}",
        "GET-VALUE_RESULTS": "${{steps.get-value.outputs.result}}",
        "INSERT_RESULTS": "${{steps.insert.outputs.result}}",
        "REMOVE-AT_RESULTS": "${{steps.remove-at.outputs.result}}",
        "REMOVE-FIRST_RESULTS": "${{steps.remove-first.outputs.result}}",
        "REMOVE-LAST_RESULTS": "${{steps.remove-last.outputs.result}}",
        "REPORT_RESULTS": "${{steps.report.outputs.result}}",
        "SIZE_RESULTS": "${{steps.size.outputs.result}}"
    },
    "with": {
        "runners": "sanity,init-list,append,contains-value,get-value,insert,remove-at,remove-first,remove-last,report,size"
    }
}
*/
const makeAutogradingReporter = (allSpecs: TestSpec[]) => {
  const allNames = allSpecs.map((spec) => getNames(spec.testName));
  return {
    name: "Autograding Reporter",
    uses: "classroom-resources/autograding-grading-reporter@v1",
    env: makeEnvObject(allNames),
    with: {
      runners: allSpecs.map((spec) => getNames(spec.testName).kebab).join(","),
    },
  };
};

const steps = homeworkSpecs.map((spec) => makeStep(spec));
const autogradeStep = makeAutogradingReporter(homeworkSpecs);
// console.log("autograding step:");
// console.log(autogradeStep);

// const inYaml = dump(stepAsJson);

// console.log("Template doc as JSON:");
// console.log(JSON.stringify(doc, null, 4));
// const originalSteps = doc["jobs"]["run-autograding-tests"]["steps"];
// const newSteps = [originalSteps[0], makeStep(getNames("initList"), 10)];

doc["jobs"]["run-autograding-tests"]["steps"] = [
  makeCheckoutStep(),
  ...steps,
  autogradeStep,
];
// console.log("new steps:", newSteps);
const inYaml = dump(doc);
console.log("Final yaml:\n\n");
console.log(inYaml);
