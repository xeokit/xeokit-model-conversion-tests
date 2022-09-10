# xeokit-model-conversion-tests

This project provides a Node.js script that automatically runs a directory of IFC files through each of our IFC->XKT conversion pipelines and generates the [Model Conversion](https://xeokit.github.io/xeokit-model-conversion-tests/index.html) section of the xeokit website to show the results.

We can also use this project to test the conversion pipelines locally.

## Install

````npm install````

## Configure

Install the CLI tools we'll use in our conversion pipelines: IfcConvert, xeokit-metadata, ifc2gltf and convert2xkt.

Then configure ````./convertconfig.json```` with paths to those tools - for example:


````json
{
  "paths": {
    "IfcConvert": "~/xeokit/tools/IfcConvert-v0.7.0-e508fb4-linux64/IfcConvert",
    "xeokit-metadata": "xeokit-metadata",
    "convert2xkt": "~/xeokit/tools/xeokit-convert/convert2xkt.js",
    "ifc2gltf": "~/xeokit/tools/ifc2gltf-linux/build/Release/ifc2gltf"
  }
}
````

## Drop in your IFC Files

Drop the IFC files you want to convert into ````./inputFiles````. 

For example:

````bash
inputFiles/
├── Duplex.ifc
├── IfcOpenHouse2x3.ifc
├── IfcOpenHouse4.ifc
├── MAP.ifc
├── rac_advanced_sample_project.ifc
└── rme_advanced_sample_project.ifc
````
## Run tests

Run the test script and build the HTML pages:

```npm run build```

## Review results

When the test script has finished, the ````./results```` directory will contain converted XKT files, along with intermediate glTF and JSON files created by some of the pipelines. The directory will also contain logging output collected from the CLI tools. 
````bash
results/
├── Duplex
│   ├── ifcCommunityPipeline1
│   │   ├── log.txt
│   │   ├── model.glb
│   │   ├── model.json
│   │   └── model.xkt
│   ├── ifcCommunityPipeline2
│   │   ├── log.txt
│   │   └── model.xkt
│   ├── ifcEnterprisePipeline1
│   │   ├── log.txt
│   │   ├── model.glb
│   │   ├── model.json
│   │   └── model.xkt
│   └── model.ifc
├── IfcOpenHouse2x3
│   ├── ifcCommunityPipeline1
│   │   ├── log.txt
│   │   ├── model.glb
│   │   ├── model.json
│   │   └── model.xkt
│   ├── ifcCommunityPipeline2
│   │   ├── log.txt
│   │   └── model.xkt
│   ├── ifcEnterprisePipeline1
│   │   ├── log.txt
│   │   ├── model.glb
│   │   ├── model.json
│   │   └── model.xkt
│   └── model.ifc
├── IfcOpenHouse4
│   ├── ifcCommunityPipeline1
│   │   ├── log.txt
│   │   ├── model.glb
│   │   ├── model.json
│   │   └── model.xkt
│   ├── ifcCommunityPipeline2
│   │   ├── log.txt
│   │   └── model.xkt
│   ├── ifcEnterprisePipeline1
│   │   ├── log.txt
│   │   ├── model.glb
│   │   ├── model.json
│   │   └── model.xkt
│   └── model.ifc
├── MAP
│   ├── ifcCommunityPipeline1
│   │   ├── log.txt
│   │   ├── model.glb
│   │   ├── model.json
│   │   └── model.xkt
│   ├── ifcCommunityPipeline2
│   │   ├── log.txt
│   │   └── model.xkt
│   ├── ifcEnterprisePipeline1
│   │   ├── log.txt
│   │   ├── model.glb
│   │   ├── model.json
│   │   └── model.xkt
│   └── model.ifc
├── rac_advanced_sample_project
│   ├── ifcCommunityPipeline1
│   │   ├── log.txt
│   │   ├── model.glb
│   │   ├── model.json
│   │   └── model.xkt
│   ├── ifcCommunityPipeline2
│   │   ├── log.txt
│   │   └── model.xkt
│   ├── ifcEnterprisePipeline1
│   │   ├── log.txt
│   │   ├── model.glb
│   │   ├── model.json
│   │   └── model.xkt
│   └── model.ifc
├── resultsInfo.json
├── rme_advanced_sample_project
│   ├── ifcCommunityPipeline1
│   │   ├── log.txt
│   │   ├── model.glb
│   │   └── model.json
│   └── model.ifc
└── systemInfo.json
````

To review the test results, fire up an HTTP server:

````http-server````

Go to ````localhost:8080/index.html````:


![](https://xeokit.github.io/img/modelConversionWebsite.png)


