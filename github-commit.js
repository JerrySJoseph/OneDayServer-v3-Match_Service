const jsonFile = require("jsonfile");
const moment = require("moment");
const simpleGit = require("simple-git");
const random = require("random");

const PATH = "./data.json";

const commit = (n) => {
  if (n === 0) return simpleGit().push();
  const x = random.int(0, 54);
  const y = random.int(0, 6);

  const DATE = moment()
    .subtract(1, "y")
    .add(1, "d")
    .add(x, "w")
    .add(y, "d")
    .format();

  const data = {
    date: DATE,
  };
  console.log(`committing for n=${n} : ${DATE}`);
  jsonFile.writeFile(PATH, data).then(() => {
    simpleGit()
      .add([PATH])
      .commit(DATE, { "--date": DATE }, commit.bind(this, --n));
  });
};

commit(500);
