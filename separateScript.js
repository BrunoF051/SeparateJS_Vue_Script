import { input } from "@inquirer/prompts";
import confirm from "@inquirer/confirm";
import * as fs from "node:fs";
import path from "path";
import chalk from "chalk";

const { log } = console;

const answer = await input({ message: "Enter the origin path" });
const originPath = path.normalize(answer);
//input Origin path Manually:
//originPath = "/home/bruno/Sviluppo/scripts/scriptTest";
const destinationPath = path.join(originPath, "scripts");
log(chalk.yellowBright("originPath", originPath));

const createDestinationFolder = (destination) => {
  return fs.access(destination, (error) => {
    // To check if destinationPath directory
    // already exists or not
    if (error) {
      // If destinationPath does not exist
      // then create it
      fs.mkdir(destination, (error) => {
        if (error) {
          log(chalk.redBright(error));
        } else {
          log(
            chalk.yellowBright(
              "New Directory created successfully !!",
              destination
            )
          );
        }
      });
    } else {
      log(chalk.yellowBright("Given Directory already exists !!", destination));
    }
  });
};

createDestinationFolder(destinationPath);

let scriptRegex = "";

const createJsFiles = (origin, destination, writeVue) => {
  //geting the names on an Array
  const filesNames = fs.readdirSync(origin, (err, files) => {
    return err ?? files.join(",");
  });
  // Avoiding folders and other files extensions
  const justVueFiles = filesNames.filter((file) => {
    return file.includes(".vue");
  });
  //Creating filePaths
  const filesPaths = justVueFiles.map((file) => {
    return path.join(origin, file);
  });

  //Getting the Script tags
  const fileScriptsTags = filesPaths.map((path) => {
    const scriptTags = fs.readFileSync(path, "utf8");

    scriptRegex = /<script>([\s\S]*?)<\/script>/;

    const match = scriptTags.match(scriptRegex) ?? [
      "ERR",
      "No script tag Found in File",
    ];

    return match[1];
  });

  //Over write the vue File
  const writeNewVue = (filesPaths) => {
    return filesPaths.map((path) => {
      //Finding the filename in the path ...
      const nameRegex = /[ \w-]+?(?=\.)/;
      const matchName = path.match(nameRegex);
      const fileName = matchName[0];
      //formating the paths for imports inside <script/>...
      const pathStr = destinationPath.split("/");
      const pathSplit = pathStr.indexOf("src");
      const curatedPath = pathStr.splice(pathSplit);
      const pathFinale = curatedPath.join("/").replace("src", "@");
      // path formated
      const camelCaseFileName =
        fileName[0].toLocaleLowerCase() + fileName.slice(1);
      // content to paste on <script/>
      const newContent = `
      import ${camelCaseFileName} from '${pathFinale}/${camelCaseFileName}.js';
      export default {
        name: '${fileName}',
        mixins: [${camelCaseFileName}]
      };
      `;
      //Reading ...
      const vueFile = fs.readFileSync(path, "utf8");
      //Replacing ...
      const replaced = vueFile.replace(
        /<script>.*<\/script>/s,
        `<script>${newContent}</script>`
      );
      //Writing ...
      return fs.writeFileSync(path, replaced, "utf8");
    });
  };

  //change to camelCase
  const camelCaseNames = justVueFiles.map((name) => {
    return name.replace(/[A-Z]/, (match) => {
      return `${match.toLocaleLowerCase()}`;
    });
  });
  //Finaly creating the files
  const finalFiles = camelCaseNames.map((name, i) => {
    if (name.includes(".vue")) {
      return fs.writeFileSync(
        `${destination}/${name.replace(".vue", ".js")}`,
        `${fileScriptsTags[i]}`
      );
    }
  });

  if (writeVue) {
    writeNewVue(filesPaths);
    log(
      chalk.blueBright(
        "Extraction and replacement of the script tag done! the imports of the new js files needs to be corrected. Vue files modified"
      )
    );
    return finalFiles;
  }
  log(
    chalk.blueBright(
      "Extraction of the script tag done! the imports of the new js files needs to be corrected, Vue files weren't modified needs to be done manually"
    )
  );
  return finalFiles;
};

const overWriteVue = await confirm({
  message: "Modify Vue Files?",
  default: true,
});

const checkpath = await confirm({
  message: "Are the Paths ok?",
  default: true,
});

if (checkpath) {
  createJsFiles(originPath, destinationPath, overWriteVue);
}
process.exit(0);
