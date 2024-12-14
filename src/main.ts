import { dump, load } from "js-yaml";
import fs from "fs";
import path from "path";
import { kebabCase } from "lodash";

type TestSpec = {
  testName: string;
  points: number;
};

type Names = {
  human: string;
  npm: string;
  kebab: string;
  env: string;
};

// Use commander to parse all this
const fileName = process.argv[2];
const filePath = path.join(process.cwd(), fileName);

if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

const homeworkSpecString = fs.readFileSync(filePath, "utf8");
const homeworkSpecs: TestSpec[] = JSON.parse(homeworkSpecString);

const doc = load(fs.readFileSync("./template.yml", "utf8"));

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

doc["jobs"]["run-autograding-tests"]["steps"] = [
  makeCheckoutStep(),
  ...steps,
  autogradeStep,
];

const inYaml = dump(doc);

console.log(inYaml);
