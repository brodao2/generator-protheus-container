const chalk = require("chalk");

module.exports = {
  options: {
    "skip-banner": {
      desc: "Skips the welcome and bye banners.",
      type: Boolean
    },
    "skip-prompts": {
      desc: "Skips the prompts, if exists .yo-rc.json",
      type: Boolean
    },
    user: {
      desc: "User (arte.engpro.totvs.com.br)",
      type: String
    },
    password: {
      desc: "Password (arte.engpro.totvs.com.br)",
      type: String
    }
  },
  prompts: {
    initial: () => {
      return [
        {
          type: "list",
          message: "Select an option",
          name: "selectOption",
          choices: [
            {
              name: `Fully featured in last versions of ${chalk.bold("Panthera Onça")}`,
              value: "fully-featured",
              description:
                "All components based on Panthera Onça, in their last versions and Linux/x64."
            },
            {
              name: `Custom, based on ${chalk.bold("Panthera Onça")}`,
              value: "custom-onca",
              description:
                "Allows you to select which features and in which version, architecture and operating system."
            },
            {
              name: `Custom, based on ${chalk.bold("Harpia")}`,
              value: "custom-harpia",
              description:
                "Allows you to select which features and in which version, architecture and operating system."
            }
          ],
          store: true
        }
      ];
    },
    osArch: choices => {
      return {
        type: "list",
        message: "Operating System and Architecture",
        name: "osArch",
        loop: false,
        choices: choices,
        required: true,
        store: true,
        default: "linux-64"
      };
    },
    protheus: () => {
      return [
        {
          type: "number",
          name: "protheusPort",
          message: "Enter MPP",
          default: 5000,
          store: true
        },
        {
          type: "confirm",
          name: "protheus-security",
          message: "Use security communication?",
          default: true,
          store: true
        },
        {
          type: "confirm",
          name: "brokerEnabled",
          message: "Use broker?",
          default: false,
          store: true
        }
      ];
    },
    broker: () => {

      return [
        {
          type: "number",
          name: "brokerSecondary",
          message: "How many secondary servers? (1 to 5)",
          default: 3,
          validate: value => {
            return value > 0 && value < 6;
          },
          store: true
        }
      ];
    },
    webApp: () => {
      return [
        {
          type: "number",
          name: "webappPort",
          message: "Enter Port",
          default: 8089,
          store: true
        }
      ];
    },
    dbAccess: () => {
      return [
        {
          type: "number",
          name: "dbAccessPort",
          message: "Enter Port",
          default: 7890,
          store: true
        }
      ];
    },
    otherSettings: () => {
      return [
        {
          type: "input",
          name: "licenseServer",
          message: "License Server (IP:Port)?",
          default: "licensedev.totvs.com.br:8850",
          store: true
        },
        {
          type: "input",
          name: "user",
          message: "User (arte.engpro.totvs.com.br)?",
          default: "", //this.options.user ||
          store: true
        },
        {
          type: "password",
          name: "password",
          message: "Password",
          mask: "*",
          default: "", //this.options.password || "",
          store: true
        }
      ];
    },
    sgdbSelection: () => {
      return [
        {
          type: "list",
          name: "sgdb",
          message: "SGDB?",
          default: "postgresql",
          choices: [
            {
              name: "MS-SQL (Container)",
              value: "mssql"
            },
            {
              name: "PostgreSQL (Container)",
              value: "postgresql"
            },
            {
              name: "MS-SQL (External)",
              value: "mssql-external"
            },
            {
              name: "PostgreSQL (External)",
              value: "postgresql-external"
            }
          ],
          store: true
        }
      ];
    },
    sgdbConfiguration: sgdb => {
      let prompts = [];

      if (sgdb.endsWith("external")) {
        prompts = [
          {
            type: "url",
            name: "sgdbAddress",
            message: "Enter Address",
            default: "127.0.0.1:" + (sgdb.startsWith("mssql") ? "1433" : "5432"),
            store: true
          }
        ];
      }

      prompts.push(
        {
          type: "input",
          name: "dbUser",
          message: "DB User",
          default: sgdb.startsWith("mssql") ? "sa" : "root",
          store: true
        },
        {
          type: "password",
          name: "dbPassword",
          message: "DB Password",
          mask: "*",
          store: true
        }
      );

      return prompts;
    },
    container: () => {
      return [
        {
          type: "list",
          name: "containerManager",
          message: "Build container with?",
          default: "podman",
          choices: [
            {
              name: "Podman",
              value: "podman"
            },
            {
              name: "Docker",
              value: "docker"
            }
          ],
          store: true
        },
        {
          type: "input",
          name: "containerName",
          message: "Container Name",
          default: "my-machine",
          store: true
        }
      ];
    }
  }
};
