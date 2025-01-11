/* eslint-disable prettier/prettier */
const Generator = require("yeoman-generator");
const chalk = require("chalk");
const yosay = require("yosay");
const path = require('path');

const config = require('./config');
const smallBanner = require("./small-banner");
const featuresChoices = require("./features");
const internal = require("stream");

module.exports = class extends Generator {
  constructor(args, opts) {
    super(args, opts);

    // eslint-disable-next-line guard-for-in
    for (let optionName in config.options) {
      this.option(optionName, config.options[optionName]);
    }
  }

  // initializing() {
  //   this.log("initializing");
  // }

  async prompting() {
    let answers = {}
    let message = `${`Welcome to the`} ${chalk.blue("Container Protheus")} ${`generator.`}

${"I will help you create a Container Protheus,"}
${"focused on development and testing."}
${chalk.bold("Let's start!")}
`;

    if (this.options['skip-banner']) {
      this.log(message);
    } else {
      this.log(
        yosay(`${smallBanner()}

        ${message}`, { maxLength: 62 })
      );
    }

    if (this.options["skip-prompts"]) {
      let answers = this.config.get('promptValues')

      if (answers !== undefined) {
        this.log(chalk.yellow("Using cached answers."));
        answers = {
          ...answers,
          ...await this.prompt([
            {
              type: "input",
              name: "user",
              message: "User (arte.engpro.totvs.com.br)?",
              default: this.options.user || "",
              //store: true
            },
            {
              type: "password",
              name: "password",
              message: "Password",
              mask: "*",
              default: this.options.password || "",
              //store: true
            },
          ])
        };

        this.props = answers;

        return;
      }
    }

    answers = await this.prompt(config.prompts.initial());

    if (answers.selectOption === "fully-featured") {
      answers.features = ["protheus-onca-latest", "dbaccess-latest", "webapp-onca-latest"];
    } else {
      const targetProtheus = answers.selectOption === "custom-onca" ? "onca" : "harpia";
      const targetTitle = answers.selectOption === "custom-onca" ? "Panthera Onça" : "Harpia";
      let choices = [];

      choices.push({ type: "separator" });
      featuresChoices.getOsArch(this).
        forEach(choice => {
          choices.push({
            name: `${choice.name}`,
            value: `${choice.value}`
          });
        });

      answers = {
        ...answers,
        ...await this.prompt({
          ...config.prompts.osArch(choices)
        })
      }

      const os = answers.osArch.split("-")[0];
      const arch = answers.osArch.split("-")[1];
      let oldName = "";

      choices = [];
      featuresChoices.getFeatures(os, arch, this).
        filter(choice => choice.value.includes(targetProtheus) ||
          (choice.value.startsWith("dbaccess"))).
        forEach(choice => {
          if (oldName !== choice.id) {
            choices.push({ type: "separator" });
            oldName = choice.id;
          }

          choices.push({
            name: `${choice.name}`,
            value: `${choice.value}`
          });

        });

      answers = {
        ...answers,
        ...await this.prompt({
          type: "checkbox",
          message: `Features (${chalk.blue(targetTitle)})`,
          name: "features",
          loop: false,
          choices: choices,
          validate: function (value) {
            return value.length > 0;
          },
          store: true
        })
      };

      if (answers.features.length === 0) {
        throw new Error("No features selected. Nothing to do.");
      }

      if (answers.features.filter(selection => selection.startsWith("protheus")).length > 0) {
        this.log(`${chalk.bold("Protheus configuration")}`);
        answers = {
          ...answers,
          ...await this.prompt(config.prompts.protheus())
        };

        if (answers.brokerEnabled) {
          answers = {
            ...answers,
            ...await this.prompt(config.prompts.broker())
          }
        }
      }

      if (answers.features.filter(selection => selection.startsWith("webapp")).length > 0) {
        this.log(`${chalk.bold("WebApp configuration")}`);
        answers = {
          ...answers,
          ...await this.prompt(config.prompts.webApp())
        };
      }

      if (answers.features.filter(selection => selection.startsWith("dbaccess")).length > 0) {
        this.log(`${chalk.bold("DBAccess configuration")}`);

        answers = {
          ...answers,
          ...await this.prompt(config.prompts.dbAccess())
        }
      }

      this.log(`${chalk.bold("SGDB configuration")}`);
      answers = {
        ...answers,
        ...await this.prompt(config.prompts.sgdbSelection())
      }

      answers = {
        ...answers,
        ...await this.prompt(config.prompts.sgdbConfiguration(answers.sgdb))
      };

      this.log(`${chalk.bold("Other Settings")}`);
      answers = {
        ...answers,
        ...await this.prompt(config.prompts.otherSettings())
      };
    }

    this.log(`${chalk.bold("Container configuration")}`);
    answers = {
      ...answers,
      ...await this.prompt(config.prompts.container())
    };

    // Use this.props to access the answers given by the user
    this.props = answers;
  }

  // configuring() {
  //   //nothing to do
  // }

  // default() {
  //   //nothing to do
  // }

  async writing() {
    this.log("writing start");

    let downloadList = [];
    let tarList = [];
    let zipList = [];
    let copyList = [];
    const varList = {};

    for (const feature of this.props.features) {
      this.log.info(`Select to downloading (${this.props.features.indexOf(feature) + 1}/${this.props.features.length}) ${feature}...`);

      const urls = featuresChoices.getDownloadPath(feature, this.props.user, this.props.password || "", this.props.sgdb, this);
      urls.forEach(url => {
        const sourcePath = url.source;
        let targetFile = feature.startsWith("rpo") ?
          `${path.basename(sourcePath)}` :
          `${feature}${path.extname(sourcePath)}`;
        const targetFolder = url.targetFolder;

        downloadList.push({
          source: sourcePath,
          file: `${targetFile}`,
          folder: `${targetFolder}`,
        });

        if (path.extname(sourcePath) === ".gz") {
          tarList.push({
            file: `${targetFile}`,
            folder: `${targetFolder}`,
          });
        } else if (
          (path.extname(sourcePath) === ".zip")) {
          zipList.push({
            file: `${targetFile}`,
            folder: `${targetFolder}`,
          });
        }
      });
    }

    copyList.push({
      source: "./etc/init.d",
      target: "/etc/init.d/totvs.d",
      internal: false,
    });

    if (this.props.brokerEnabled) {
      //gerar ini broker e secundarios

      for (let index = 0; index <= this.props.brokerSecondary; index++) {
        copyList.push({
          source: "/totvs/bin/protheus/appserver",
          target: `/totvs/bin/protheus/appserver-${index}/+1`,
          internal: true,
        });
      }
    }

    this.props.features.forEach(feature => {
      const featureName = feature.split("-")[0];
      const featureFolder = this.destinationPath("_images", featureName);
      varList[featureName.split("_")[0]] = `${featureFolder} `;
    });

    varList.appVersion = this.fs.readJSON(this.destinationPath("package.json")).version;
    varList.downloadList = downloadList;
    varList.tarList = tarList;
    varList.zipList = zipList;
    varList.copyInternalList = copyList.filter((copyInfo) => copyInfo.internal);
    varList.copyExternalList = copyList.filter((copyInfo) => !copyInfo.internal);
    varList.containerManager = this.props.containerManager;
    varList.containerName = this.props.containerName;
    varList.sgdb = this.props.sgdb;
    varList.exposePorts = [
      this.props.webappPort,
      this.props.protheusPort,
      this.props.dbAccessPort,
    ].sort((a, b) => a < b ? -1 : 0).join(" ");

    const outputFile = (this.props.containerManager === "podman") ?
      "Containerfile" : "Dockerfile";
    let secondaries = [];
    for (let index = 0; index < this.props.brokerSecondary; index++) {
      secondaries.push(index + 1);
    }

    if (this.props.brokerEnabled) {
      // gerar ini appserver
      secondaries.forEach((sequence) => {
        this.fs.copyTpl(
          this.templatePath("appserver", "appserver-daemon.sh.txt"),
          this.destinationPath("_images", "appserver", "etc", "init.d", `appserver-${sequence}.sh`),
          {
            appSequence: `-${sequence}`,
            ...varList
          },
          { debug: false }
        );
      });
    }

    this.fs.copyTpl(
      this.templatePath("appserver", "appserver-daemon.sh.txt"),
      this.destinationPath("_images", "appserver", "etc", "init.d", "appserver.sh"),
      {
        appSequence: "",
        ...varList
      },
      { debug: false }
    );

    this.fs.copyTpl(
      this.templatePath("appserver", "appserver-start.sh.txt"),
      this.destinationPath("_images", "appserver", "appserver-start.sh"),
      {
        secondaries: secondaries,
        ...varList
      },
      { debug: true }
    );

    this.fs.copyTpl(
      this.templatePath("appserver", "dockerfile.appserver.txt"),
      this.destinationPath("_images", "appserver", outputFile),
      varList,
      { debug: true }
    );

    if (this.props.sgdb === "mssql") {
      this.fs.copyTpl(
        this.templatePath("mssql", "dockerfile.mssql.txt"),
        this.destinationPath("_images", "mssql", outputFile),
        varList,
        { debug: false }
      );
    } else if (this.props.sgdb === "postgresql") {
      this.fs.copyTpl(
        this.templatePath("postgresql", "dockerfile.postgresql.txt"),
        this.destinationPath("_images", "postgresql", outputFile),
        varList,
        { debug: false }
      );

      this.fs.copyTpl(
        this.templatePath("postgresql", "docker-ensure-initdb.sh"),
        this.destinationPath("_images/postgresql", "docker-ensure-initdb.sh"),
        varList,
        { debug: false }
      );

      this.fs.copyTpl(
        this.templatePath("postgresql", "docker-entrypoint.sh"),
        this.destinationPath("_images/postgresql", "docker-entrypoint.sh")
      );
    }

    this.fs.copyTpl(
      this.templatePath("build-container.bat.txt"),
      this.destinationPath("_images", "build-container.bat"),
      varList,
      { debug: false }
    );
  }

  conflicts() {
    this.log("conflicts");
  }

  // install() {
  //   this.log("install");
  //   this.installDependencies();
  // }

  end() {
    const colorConsole = (text) => {
      //return chalk.bgBlack(chalk.white(text));
      return chalk.bgCyan(chalk.white(text).concat('_'.repeat(60)).substring(0, 60));
    };

    const message = `
${`Container define file ${chalk.blue("Protheus")} generated ${chalk.blue("successfully")}!`}
${`To build the container, run the following command:`}
  ${colorConsole(`${this.props.containerManager} build -t ${this.props.containerName} ./_images`)}

${"To run the container, run the following command:"}
  ${colorConsole(`${this.props.containerManager} run -d --name ${this.props.containerName} ${this.props.containerName}`)}

${"To see public ports, run the following command:"}
  ${colorConsole(`${this.props.containerManager} container ls --format "{{.Names}} {{.Ports}}" \\
    -f ancestor=${this.props.containerName}`)}

${"Enjoy and good luck!"}`;

    if (this.options['skip-banner']) {
      this.log(message);
    } else {
      this.log(yosay(`${smallBanner()}
      ${message}`, { maxLength: 62 }))
    }
  };
};
