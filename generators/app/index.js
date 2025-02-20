/* eslint-disable prettier/prettier */
const Generator = require("yeoman-generator");
const chalk = require("chalk");
const yosay = require("yosay");
const path = require('path');
const fse = require("fs-extra");

const config = require('./config');
const smallBanner = require("./small-banner");
const featuresChoices = require("./features");

const DEBUG_COPY_TPL = false;

module.exports = class extends Generator {
  constructor(args, opts) {
    super(args, opts);

    // eslint-disable-next-line guard-for-in
    for (let optionName in config.options) {
      this.option(optionName, config.options[optionName]);
    }
  }

  initializing() {
    const _imagesFolder = this.destinationPath("_images");

    if (fse.existsSync(_imagesFolder)) {
      fse.rmSync(_imagesFolder, { recursive: true });
    }

    if (fse.existsSync("container.bat")) {
      fse.removeSync("container.bat");
    }

    fse.ensureDirSync(_imagesFolder);
  }

  async prompting() {
    let answers = {}
    let message = `Welcome to the ${chalk.blue("Container Protheus")} generator.

I will help you create a Container Protheus,
focused on development and testing.
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
              // Store: true
            },
            {
              type: "password",
              name: "password",
              message: "Password",
              mask: "*",
              default: this.options.password || "Divisao@Panzer1932",
              // Store: true
            },
          ])
        };

        this.props = answers;

        return;
      }
    }

    this.log("Configuração para uso exclusivo em ambiente de desenvolvimento ou testes, com acesso via WebApp.");
    this.log(chalk.bold(chalk.red("Não utilize em ambiente de produção.")));

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
        this.log(`${chalk.bold("Protheus Configuration")}`);
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
        this.log(`${chalk.bold("WebApp Configuration")}`);
        answers = {
          ...answers,
          ...await this.prompt(config.prompts.webApp())
        };
      }

      if (answers.features.filter(selection => selection.startsWith("dbaccess")).length > 0) {
        this.log(`${chalk.bold("DBAccess Configuration")}`);

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

    this.log(`${chalk.bold("Container Configuration")}`);
    answers = {
      ...answers,
      ...await this.prompt(config.prompts.container())
    };

    // Use this.props to access the answers given by the user
    this.props = answers;
  }

  // Configuring() {
  //   //nothing to do
  // }

  // default() {
  //   //nothing to do
  // }
  _prepareStartAppServer(secondaries, copyList, varList) {
    this.fs.copyTpl(
      this.templatePath("appserver", "appserver-start.sh.txt"),
      this.destinationPath("_images", "appserver", "appserver-start.sh"),
      {
        secondaries: secondaries,
        ...varList
      },
      { debug: DEBUG_COPY_TPL }
    );

    // CopyList.push({
    //    source: "./etc/init.d",
    //    target: "/etc/init.d/totvs.d",
    //    internal: false,
    //  });

  }

  _prepareDownloadList(downloadList, tarList, zipList) {

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
          container: url.container
        });

        if (path.extname(sourcePath) === ".gz") {
          tarList.push({
            file: `${targetFile}`,
            folder: `${targetFolder}`,
            container: url.container
          });
        } else if (
          (path.extname(sourcePath) === ".zip")) {
          zipList.push({
            file: `${targetFile}`,
            folder: `${targetFolder}`,
            container: url.container
          });
        }
      });
    }
  }

  _prepareBroker(secondaries, copyList, varList) {
    copyList.push({
      source: "/totvs/bin/protheus/appserver",
      target: "/totvs/bin/protheus/broker",
      internal: true,
    });

    this.fs.copyTpl(
      this.templatePath("appserver", "appserver-broker.sh.txt"),
      this.destinationPath("_images", "appserver", "etc", "init.d", "appserver.sh"),
      {
        appSequence: "",
        ...varList
      },
      { debug: DEBUG_COPY_TPL }
    );

    this.fs.copyTpl(
      this.templatePath("appserver", "broker.ini.txt"),
      this.destinationPath("_images", "appserver", "ini", "broker", "appserver.ini"),
      {
        protheusPort: this.props.protheusPort,
        secondaries: secondaries.map((sequence, index) => {
          return {
            sequence: `0${sequence}`,
            port: this.props.protheusPort + index + 1,
          }
        })
      },
      { debug: DEBUG_COPY_TPL }
    );

    secondaries.forEach((sequence) => {
      this.fs.copyTpl(
        this.templatePath("appserver", "appserver.ini.txt"),
        this.destinationPath("_images", "appserver", "ini", `appserver-${sequence}`, "appserver.ini"),
        {
          sgdb: this.props.sgdb,
          appServerPort: this.props.protheusPort,
          licenseServer: this.props.licenseServer.split(":")[0],
          licensePort: this.props.licenseServer.split(":")[1],
          webMoniMonitorPort: this.props.webMonitorPort,
          containerName: this.props.containerName,
          dbAccessPort: this.props.dbAccessPort,
          webMonitorPort: this.props.webMonitorPort,
          secondaries: secondaries.map((sequence, index) => {
            return {
              sequence: `0${sequence}`,
              port: this.props.protheusPort + index + 1,
            }
          })
        },
        { debug: DEBUG_COPY_TPL }
      );

      this.fs.copyTpl(
        this.templatePath("appserver", "appserver-daemon.sh.txt"),
        this.destinationPath("_images", "appserver", "etc", "init.d", `appserver-${sequence}.sh`),
        {
          appSequence: `-${sequence}`,
          ...varList
        },
        { debug: DEBUG_COPY_TPL }
      );

      copyList.push({
        source: "/totvs/bin/protheus/appserver",
        target: `/totvs/bin/protheus/appserver-${sequence}`,
        internal: true,
      });
    });

    copyList.push({
      source: "./ini/",
      target: `/totvs/bin/protheus/`,
      internal: false,
    });
  }

  _prepareStandAlone(copyList, varList) {
    copyList.push({
      source: "./ini/",
      target: `/totvs/bin/protheus/`,
      internal: false,
    });

    this.fs.copyTpl(
      this.templatePath("appserver", "appserver-daemon.sh.txt"),
      this.destinationPath("_images", "appserver", "etc", "init.d", `appserver.sh`),
      {
        appSequence: "",
        ...varList
      },
      { debug: DEBUG_COPY_TPL }
    );

  }

  _prepareDbaccess(varList) {

    this.fs.copyTpl(
      this.templatePath("dbaccess", "dbaccess-daemon.sh.txt"),
      this.destinationPath("_images", "dbaccess", "etc", "init.d", "dbaccess.sh"),
      {
        appSequence: "",
        ...varList
      },
      { debug: DEBUG_COPY_TPL }
    );
  }

  writing() {
    this.log("writing start");

    let downloadList = [];
    let tarList = [];
    let zipList = [];
    let copyList = [];
    const varList = {};
    const outputFile = (this.props.containerManager === "podman") ?
      "Containerfile" : "Dockerfile";
    let secondaries = [];
    for (let index = 0; index < this.props.brokerSecondary; index++) {
      secondaries.push(index + 1);
    }

    this.props.features.forEach(feature => {
      const featureName = feature.split("-")[0];
      const featureFolder = this.destinationPath("_images", featureName);
      varList[featureName.split("_")[0]] = `${featureFolder} `;
    });

    varList.appVersion = this.fs.readJSON(this.destinationPath("package.json")).version;
    varList.containerManager = this.props.containerManager;
    varList.containerName = this.props.containerName;
    varList.sgdb = this.props.sgdb;
    varList.dbUser = this.props.dbUser;
    varList.dbPassword = this.props.dbPassword;
    varList.licenseServer = this.props.licenseServer;
    varList.exposePorts = [
      this.props.webappPort,
      this.props.protheusPort,
      this.props.dbAccessPort,
    ].sort((a, b) => a < b ? -1 : 0).join(" ");
    varList.protheusPort = this.props.protheusPort;

    this._prepareDownloadList(downloadList, tarList, zipList);

    if (this.props.brokerEnabled) {
      this._prepareBroker(secondaries, copyList, varList);
    } else {
      this._prepareStandAlone(copyList, varList);
    }

    this._prepareStartAppServer(secondaries, copyList, varList);



    this._prepareDbaccess(varList);

    varList.copyInternalList = copyList.filter((copyInfo) => copyInfo.internal);
    varList.copyExternalList = copyList.filter((copyInfo) => !copyInfo.internal);

    this.fs.copyTpl(
      this.templatePath("appserver", "dockerfile.appserver.txt"),
      this.destinationPath("_images", "appserver", outputFile),
      {
        ...varList,
        downloadList: downloadList.filter((value) => {
          return value.container === "appserver";
        }),
        tarList: tarList.filter((value) => {
          return value.container === "appserver";
        }),
        zipList: zipList.filter((value) => {
          return value.container === "appserver";
        })
      },
      { debug: DEBUG_COPY_TPL }
    );

    if (this.props.sgdb === "mssql") {
      this.fs.copyTpl(
        this.templatePath("mssql", "dockerfile.mssql.txt"),
        this.destinationPath("_images", "mssql", outputFile),
        {
          ...varList,
          downloadList: downloadList.filter((value) => {
            return value.container === "sgdb";
          }),
          tarList: tarList.filter((value) => {
            return value.container === "sgdb";
          }),
          zipList: zipList.filter((value) => {
            return value.container === "sgdb";
          })
        },
        { debug: DEBUG_COPY_TPL }
      );

    } else if (this.props.sgdb === "postgresql") {
      this.fs.copyTpl(
        this.templatePath("postgresql", "dockerfile.postgresql.txt"),
        this.destinationPath("_images", "postgresql", outputFile),
        varList,
        { debug: DEBUG_COPY_TPL }
      );

      this.fs.copyTpl(
        this.templatePath("postgresql", "docker-ensure-initdb.sh"),
        this.destinationPath("_images/postgresql", "docker-ensure-initdb.sh"),
        varList,
        { debug: DEBUG_COPY_TPL }
      );

      this.fs.copyTpl(
        this.templatePath("postgresql", "docker-entrypoint.sh"),
        this.destinationPath("_images/postgresql", "docker-entrypoint.sh")
      );
    }

    if (this.props.containerManager === "docker") {
      this.fs.copyTpl(
        this.templatePath("docker", "docker-compose.yml.txt"),
        this.destinationPath("_images", "docker-compose.yml"),
        varList,
        { debug: DEBUG_COPY_TPL }
      );
      this.fs.copyTpl(
        this.templatePath("docker-container.bat.txt"),
        this.destinationPath(".", "container.bat"),
        varList,
        { debug: DEBUG_COPY_TPL }
      );
    } else {
      this.fs.copyTpl(
        this.templatePath("pod-container.bat.txt"),
        this.destinationPath(".", "container.bat"),
        varList,
        { debug: DEBUG_COPY_TPL }
      );
    }

    // Restaurar  banco de dados

    // rodar configuração do dbaccess

  }

  conflicts() {
    this.log("conflicts");
  }

  // Install() {
  //   this.log("install");
  //   this.installDependencies();
  // }

  end() {
    const colorConsole = (text) => {
      // Return chalk.bgBlack(chalk.white(text));
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

${"Enjoy and good luck! :)"}`;

    if (this.options['skip-banner']) {
      this.log(message);
    } else {
      this.log(yosay(`${smallBanner()}
      ${message}`, { maxLength: 62 }))
    }
  };
};
