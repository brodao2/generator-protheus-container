# Generator Protheus Container
[![NPM version][npm-image]][npm-url]

## Requirements

* [Node.js](https://nodejs.org/)
* [Docker](https://www.docker.com/) or [Podman](https://podman.io/)

## Installation

Install [Yeoman](http://yeoman.io) and [_generator-protheus-container_](https://github.com/brodao2/generator-protheus-container) using [npm](https://www.npmjs.com/) (we assume you have pre-installed [node.js](https://nodejs.org/)).

```bash
npm install -g yo generator-protheus-container
```

## Usage

Generate your new container project:

```bash
mkdir my-protheus-container
chdir my-protheus-container
yo protheus-container
```
Answer the requests made and wait for the process to be completed and create containers.

```bash
build-container.bat
```

After create the containers, you can run it:

```bash
run-container.bat
```

[npm-image]: https://badge.fury.io/js/generator-protheus-container.svg
[npm-url]: https://npmjs.org/package/generator-protheus-container
