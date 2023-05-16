# xeokit-model-conversion-tests

This project provides a Node.js script that automatically runs a directory of IFC files through each of our IFC->XKT conversion pipelines and generates the [Model Conversion](https://xeokit.github.io/xeokit-model-conversion-tests/index.html) section of the xeokit website to show the results.

We can also use this project to test the conversion pipelines locally.

## Install
````bash
npm install
````

## Configure

Install the CLI tools that are required in the conversion pipelines: IfcConvert, xeokit-metadata, ifc2gltf and convert2xkt.  

You can download pre-build packages here:
- IfcConvert: https://blenderbim.org/docs-python/ifcconvert/installation.html
- xeokit-metadata: https://github.com/bimspot/xeokit-metadata/releases
- ifc2gltf: https://github.com/Creoox/creoox-ifc2gltfcxconverter/releases

You might have to install some dependencies for the CLI tools to work.  
- xeonet-metadata requires the .NET runtime. Installation instructions for Ubuntu:  
  https://docs.microsoft.com/en-us/dotnet/core/install/linux-ubuntu  
- ifc2gltf requires c++ libraries. You can install them using the GNU Compiler Collection (GCC) suite.
  ````bash
  sudo apt install build-essential
  ````

Configure `./convertconfig.json` with paths to those tools - for example:
````json
{
  "paths": {
    "IfcConvert": "~/xeolabs/xeokit/IfcConvert/IfcConvert-v0.7.0-e508fb4-linux64/IfcConvert",
    "xeokit-metadata": "xeokit-metadata",
    "convert2xkt": "~/xeolabs/xeokit/xeokit-convert/convert2xkt.js",
    "ifc2gltf": "~/xeolabs/xeokit/ifc2gltf/2_6_5/ifc2gltfcxconverter-2.6.5/linux/build/Release/ifc2gltfcxconverter"
  }
}
````

## Drop in your IFC Files

Drop the IFC files you want to convert into `./inputFiles`. 

For example:
````text
./inputFiles/
├── Archicad
│    ├── Archicad-Demoprojekt.ifc
│    └── AR-Demo_Sample_Building_01.ifc
├── BIMData
│    ├── 19_rue_Marc_Antoine_Petit_Ground_floor.ifc
│    └── MAP.ifc
├── blenderbim
│    └── auto-geolocation.ifc
└─── buildingSMART_IFC2.3
     └── Clinic_Architectural.ifc
````
## Run tests

Run the test script and build the HTML pages:

````bash
npm run build
````

## Review results

When the test script has finished, the `./results` directory will contain converted XKT files, along with intermediate glTF and JSON files created by some of the pipelines. The directory will also contain logging output collected from the CLI tools. 
````text
./results/
├── Archicad
│   ├── Archicad-Demoprojekt
│   │   ├── ifcCommunityPipeline1
│   │   │   ├── log.txt
│   │   │   ├── model.glb
│   │   │   ├── model.json
│   │   │   └── model.xkt
│   │   ├── ifcCXConverterPipeline1
│   │   │   ├── log.txt
│   │   │   ├── model.glb
│   │   │   ├── model.json
│   │   │   └── model.xkt
│   │   └── model.ifc
│   └── AR-Demo_Sample_Building_01
│       ├── ifcCommunityPipeline1
│       │   ├── log.txt
│       │   ├── model.glb
│       │   ├── model.json
│       │   └── model.xkt
│       ├── ifcCXConverterPipeline1
│       │   ├── log.txt
│       │   ├── model.glb
│       │   ├── model.json
│       │   └── model.xkt
│       └── model.ifc
├── BIMData
│   ├── 19_rue_Marc_Antoine_Petit_Ground_floor
│   │   ├── ifcCommunityPipeline1
│   │   │   ├── log.txt
│   │   │   ├── model.glb
│   │   │   ├── model.json
│   │   │   └── model.xkt
│   │   ├── ifcCXConverterPipeline1
│   │   │   ├── log.txt
│   │   │   ├── model.glb
│   │   │   ├── model.json
│   │   │   └── model.xkt
│   │   └── model.ifc
│   └── MAP
│       ├── ifcCommunityPipeline1
│       │   ├── log.txt
│       │   ├── model.glb
│       │   ├── model.json
│       │   └── model.xkt
│       ├── ifcCXConverterPipeline1
│       │   ├── log.txt
│       │   ├── model.glb
│       │   ├── model.json
│       │   └── model.xkt
│       └── model.ifc
├── blenderbim
│   └── auto-geolocation
│       ├── ifcCommunityPipeline1
│       │   ├── log.txt
│       │   ├── model.glb
│       │   ├── model.json
│       │   └── model.xkt
│       ├── ifcCXConverterPipeline1
│       │   ├── log.txt
│       │   ├── model.glb
│       │   ├── model.json
│       │   └── model.xkt
│       └── model.ifc
├── buildingSMART_IFC2.3
│   └── Clinic_Architectural
│       ├── ifcCommunityPipeline1
│       │   ├── log.txt
│       │   ├── model.glb
│       │   ├── model.json
│       │   └── model.xkt
│       ├── ifcCXConverterPipeline1
│       │   ├── log.txt
│       │   ├── model.glb
│       │   ├── model.json
│       │   └── model.xkt
│       └── model.ifc
└── systemInfo.json
````

To review the test results, fire up an HTTP server:

`http-server`

Go to `localhost:8080/index.html`:


![](https://xeokit.github.io/img/modelConversionWebsite.png)


