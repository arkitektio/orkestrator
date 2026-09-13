[![codecov](https://codecov.io/gh/arkitektio/orkestrator/branch/main/graph/badge.svg?token=UGXEA2THBV)](https://codecov.io/gh/arkitektio/orkestrator)
[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://github.com/arkitektio/orkestrator/)
![Maintainer](https://img.shields.io/badge/maintainer-jhnnsrs-blue)

# Orkestrator (Next)

This repository includes the Next version of Orkestrator frontend
for the arkitekt platform. It is currently under development and not ready for production.

> [!IMPORTANT]
> This version of Orkestrator is only working with the next version of the arkitekt platform. It is not compatible with the released version of the platform.

# Installation

While the new version of Orkestrator is still under development, you can install it by downloading one of the releases
from the [release page](https://github.com/arkitektio/orkestrator/releases) fitting your operating system.
We provide installers for Windows and MacOS, as well as an AppImage and deb package for Linux.

> [!NOTE]
> We are working on providing a better installation experience, including automatic updates and a better installer. But for now, this is the best we can do. We will also provide a portable version of the application in the future.

### Linux

We provide a both an AppImage and a deb package for Linux. The AppImage should work on most distributions, while the deb package is specifically for Debian based distributions like Ubuntu.

### MacOS

Just install the application by dragging it to your Applications folder. The applicatin is signed, so you should not have any issues with Gatekeeper. If you do, you can follow the instructions [here](https://support.apple.com/en-us/HT202491) to allow the application to run.

### Windows

Just download the installer and run it. It should install the application and create a desktop shortcut for you.
Windows might ask you if you really want to install the application, because it is not signed. You can safely
ignore this warning and proceed with the installation. Follow the instructions [here](https://www.minitool.com/backup-tips/windows-protected-your-pc.html)

# Roadmap

Before the new version of Orkestrator can be merged into the main repository, the following features need to be implemented:

## General Next Features

- [x] Build around arkitekt-ts (instead of custom graphql clients)
- [x] Move Basic UI to Shadcn/UI
- [x] Move to Vite
- [x] Move to React 19
- [x] Move to Electron (Allows us to finally use SSL on the network)
- [x] New Workflow Engine (Fluss)
- [x] Integrate Kabinet App Store
- [x] Move to new GraphQL Protocols (subscriptions based on graphql-ws, standardized error and param handling (pagination(filter))
- [X] Basic UI Testing
- [X] Documentation, Documentation, Documentation
- [x] Lazy Load Modules (only if corresponding service in Deployment)
- [x] Hosted Deployment (Discarded for electron app)
- [x] CI/CD Pipeline

## Service Specific Next Features

### Lok

- [x] User Management
- [x] Advanced App and Config Management (around Fakts)

### Mikro

- [x] Move to Mikro Next
- [x] Establish "Views" as central concept
- [x] Deprecated OMERO metadata support
- [X] Lazy Renderer (similar to Vizarr)

### Fluss

- [x] Establish new Workflow UI + Engine (typesafe, wizard, ...) (looks nice)
- [x] Move to Fluss Next
- [x] More tightly integrate Schedulers in UI

### Rekuest

- [x] Move to Rekuest Next

### Kabinet

- [x] Establish Kabinet
- [x] Create App Store like Feature
- [x] Create App Store UI

### Kraph

- [x] Establish Kraph as the de facto "Knowledge Graph" for Arkitekt Services
- [x] Create Knowledge Widgets
- [ ] Allow simple creation of new Graphs
- [ ]


### Omero-Ark

- [ ] Improve Omero UI
- [ ] Allow metadata editing in UI

### Port

- [x] Port is now deprecated for Kabinet

### Kluster

- [ ] Build Kluster UI
- [ ] Elaborate on Dask-Cluster integration
- [ ] Provide support for other cluster

### Elektro

- [x] Implement basic trace visualization
