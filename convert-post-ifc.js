const fs = require("fs");
const path = require("path");
const si = require('systeminformation');
const axios = require('axios');
const {KDTree, math} = require('./lib/KDTree.js');

const configsData = fs.readFileSync("./convertconfig.json");
const configs = JSON.parse(configsData);

const inputFilesDir = "./inputFiles/ifc/";
const convertedModelsDir = "./convertedModels/ifc/";
const convertedProjectsDir = "./convertedModels/ifc/projects/";

const ifcSizes = {};
const xktSizes = {};
const conversionTimes = {};
const ifcAttributionPaths = {};
const errors = {};

const kdTree = new KDTree();

(async () => {
    try {

        console.log(`Creating HTML Report for IFC Conversion Tests`);

        const fetchPackageVersion = async (packageName) => {
            try {
                const response = await axios.get(`https://registry.npmjs.org/${packageName}`);
                if (response.status === 200) {
                    return response.data['dist-tags'].latest;
                } else {
                    console.error(`Error fetching version for ${packageName}: ${response.statusText}`);
                    return "Latest";
                }
            } catch (error) {
                console.error(`Error fetching version for ${packageName}: ${error.message}`);
                return "Latest";
            }
        };

        async function getLatestReleaseVersion(owner, repo) {
            try {
                const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/releases/latest`);
                if (response.status === 200) {
                    const latestVersion = response.data.tag_name;
                    return latestVersion;
                } else {
                    console.error(`Error: Unable to fetch latest release. Status code: ${response.status}`);
                    return "Latest";
                }
            } catch (error) {
                console.error('Error:', error.message);
                return "Latest";
            }
        }

        const xeokitVersion = await fetchPackageVersion('@xeokit/xeokit-sdk');
        const xeokitConvertVersion = await fetchPackageVersion('@xeokit/xeokit-convert');
        const cxConvertVersion = await getLatestReleaseVersion("Creoox", "creoox-ifc2gltfcxconverter");

        const date = new Date();

        const systemInfo = {
            version: await si.version(),
            time: await si.time(),
            system: si.system(),
            cpu: await si.cpu(),
            mem: await si.mem(),
            graphics: await si.graphics(),
            os: await si.osInfo()
        };

        fs.writeFileSync("./_includes/ifc/ifc-ifc2gltfOptions.html",
            `@@include('../../_includes/ifc/ifc-ifc2gltfOptionsCard.html', { 
            "ifc2gltfFileSize":"${configs.ifc2gltf.options.s}",
            "ifc2gltfTileSize":"${configs.ifc2gltf.options.t}"
            })`);

        fs.writeFileSync("./_includes/ifc/ifc-cliInvocation.html",
            `@@include('../../_includes/ifc/ifc-cliInvocationCard.html', { 
            "ifc2gltfFileSize":"${configs.ifc2gltf.options.s}",
            "ifc2gltfTileSize":"${configs.ifc2gltf.options.t}"
            })`);

        fs.writeFileSync(`${convertedModelsDir}/systemInfo.json`, JSON.stringify(systemInfo, null, "\t"), {encoding: 'utf8'});

        fs.writeFileSync("./_includes/ifc/ifc-systemInfo.html",
            `@@include('../../_includes/ifc/ifc-systemInfoCard.html', { 
            "time":"${systemInfo.time.current}",
            "date":"${date}",
            "cpuManufacturer": "${systemInfo.cpu.manufacturer}", 
            "cpuBrand": "${systemInfo.cpu.brand}",
            "osPlatform": "${systemInfo.os.platform}" ,
            "osDistro": "${systemInfo.os.distro}",
            "osRelease": "${systemInfo.os.release}",
            "totalMemory":"${Math.round(systemInfo.mem.total / 1000 / 1000 / 1000)} GB",
            "nodeVersion": "${process.version}",
            "xeokitVersion": "${xeokitVersion}",
            "xeokitConvertVersion": "${xeokitConvertVersion}",
            "cxConverterVersion": "${configs.ifc2gltf.version}"
            })`);

        const inputBatchDirs = await fs.promises.readdir(inputFilesDir);

        for (const inputBatchDir of inputBatchDirs) { // BIMData, IfcOpenShell etc

            if (inputBatchDir.startsWith("_")) {
                continue;
            }

            const inputBatchDirPath = path.join(inputFilesDir, inputBatchDir);
            const isDir = fs.lstatSync(inputBatchDirPath).isDirectory();

            if (isDir) {

                console.log(`Processing batch dir ${inputBatchDirPath}`);

                const outputBatchDirPath = path.join(convertedProjectsDir, inputBatchDir);
                if (!fs.existsSync(outputBatchDirPath)) {

                    console.error(`Dir not found: ${outputBatchDirPath}`);

                    continue;
                }

                const inputFiles = await fs.promises.readdir(inputBatchDirPath);

                //     const attributionPath = `${__dirname}/${path.join(inputBatchDirPath, `attribution.json`)}`;
                //      const attributionData = JSON.parse(fs.readFileSync(attributionPath));

                const convertedModelSetDir = `${outputBatchDirPath}/models/`;

                if (!fs.existsSync(convertedModelSetDir)) {

                    console.error(`Dir not found: ${convertedModelSetDir}`);

                    continue;
                }

                for (const inputFile of inputFiles) {  // foo.ifc, bar.ifc
                    const ext = inputFile.split('.').pop();
                    if (ext !== "ifc") {
                        continue;
                    }
                    const inputFileName = path.parse(inputFile).name;
                    const ifcInputPath = `${__dirname}/${path.join(inputBatchDirPath, inputFile)}`;
                    const convertedModelDir = `${outputBatchDirPath}/models/${inputFileName}/`;
                    const modelOutPath = convertedModelDir;
                    const glbOutputPath = path.join(modelOutPath, `model.glb`);
                    const jsonOutputPath = path.join(modelOutPath, `model.json`);
                    const logPath = path.join(modelOutPath, `log.txt`);
                    const jsonManifestPath = path.join(modelOutPath, `model.glb.manifest.json`);
                    const xktManifestPath = path.join(modelOutPath, `model.xkt.manifest.json`);
                    ifcSizes[ifcInputPath] = (getFileSize(ifcInputPath) / 1000000).toFixed(4);

                    try {
                        xktSizes[ifcInputPath] = (getXKTSize(modelOutPath, `model.xkt.manifest.json`) / 1000000).toFixed(4);
                    } catch (e) {
                        console.log(e)
                        xktSizes[ifcInputPath] = 0;
                        errors[ifcInputPath] = e;
                        continue;
                    }

                    const endTime = performance.now();
                    //     conversionTimes[ifcInputPath] = ((endTime - startTime) / 1000).toFixed(2);
                    conversionTimes[ifcInputPath] = 0;
                    //        ifcAttributionPaths[ifcInputPath] = attributionData.link;

                }

            } else {
                console.log(`Batch dir not found:  ${inputBatchDirPath}`);
            }
        }

        function getFileSize(filePath) {
            try {
                const stats = fs.statSync(filePath);
                return stats.size; // Size in bytes
            } catch (error) {
                // console.error(`Error getting file size: ${error.message}`);
                // return null;
                return 0;
            }
        }

        function getXKTSize(baseDir, manifestFilePath) {
            try {
                const manifest = fs.readFileSync(baseDir + "/" + manifestFilePath, 'utf8');
                const data = JSON.parse(manifest);
                let fileSize = 0;
                for (let i = 0, len = data.xktFiles.length; i < len; i++) {
                    fileSize += getFileSize(baseDir + "/" + data.xktFiles[i]);
                }
                return fileSize;
            } catch (error) {
                console.error(`Error loading JSON: ${error.message}`);
                return 0;
                // throw error;
            }
        }

        console.log("Writing HTML test page..");

        const conversionResultsHTML = [];

        const convertedModelsIndex = {
            batches: {}
        };

        conversionResultsHTML.push(`<section class="test-results-section">
                    <div class="container pt-6 pb-0">
                        <div class="row">
                            <div class="col-lg-12">
                                <table class="table table-sm table-hover  table-bordered mb-0">
                                <tr style="background-color: rgba(0, 0, 0, 0.05);"><th>IFC File</th><th style="text-align:right;">IFC Size (Mb)</th><th style="text-align:right;">XKT Size (Mb)</th><th style="text-align:right;">Conversion Time (Secs)</th><th style="text-align:center;" colspan="5">Converted XKT</th></tr>
                                <tbody>`);

        for (const inputBatchDir of inputBatchDirs) { // BIMData, IfcOpenShell etc
            if (inputBatchDir.startsWith("_")) {
                continue;
            }
            const inputBatchDirPath = path.join(inputFilesDir, inputBatchDir);
            const isDir = fs.lstatSync(inputBatchDirPath).isDirectory();
            if (isDir) {

                const batchData = {
                    models: {}
                }

                const projectIndex = {
                    id: `${inputBatchDir}`,
                    name: `${inputBatchDir}`,
                    models: [],
                    viewerConfigs: {
                        backgroundColor: [
                            0.95,
                            0.95,
                            1.0
                        ]
                    },
                    viewerContent: {
                        modelsLoaded: []
                    },
                    viewerState: {
                        tabOpen: "models",
                        expandObjectsTree: 3,
                        expandClassesTree: 1,
                        expandStoreysTree: 1,
                        saoEnabled: "true"
                    }
                };

                convertedModelsIndex.batches[inputBatchDir] = batchData;

                const outputBatchDirPath = path.join(convertedProjectsDir, inputBatchDir);
                conversionResultsHTML.push(`<tr style="height: 60px; vertical-align:bottom; background-color: rgba(0, 0, 0, 0.05);"><td style="font-size: larger; height: 60px; vertical-align:bottom;" ><b>${inputBatchDir}</td><td></td><td></td><td></td><td colspan="5"></td></tr>`);
                const inputFiles = await fs.promises.readdir(inputBatchDirPath);
                for (const inputFile of inputFiles) {  // foo.ifc, bar.ifc
                    const ext = inputFile.split('.').pop();
                    if (ext !== "ifc") {
                        continue;
                    }
                    console.log("Converting file: " + inputFile);
                    const inputFileName = path.parse(inputFile).name;
                    const ifcInputPath = `${__dirname}/${path.join(inputBatchDirPath, inputFile)}`;
                    const modelConvertedModelsDirPath = `${outputBatchDirPath}/models/${inputFileName}/`;
                    const community1Path = `${modelConvertedModelsDirPath}/ifcCommunityPipeline1`;
                    const glbCommunity1Path = path.join(community1Path, `model.glb`);
                    const glbCommunity1PathAbs = `${__dirname}/${glbCommunity1Path}`;
                    const jsonCommunity1Path = path.join(community1Path, `model.json`);
                    const jsonCommunity1PathAbs = `${__dirname}/${jsonCommunity1Path}`;
                    const xktCommunity1Path = path.join(community1Path, `model.xkt`);
                    const xktCommunity1PathAbs = `${__dirname}/${xktCommunity1Path}`;
                    const logCommunity1Path = path.join(community1Path, `log.txt`);
                    const logCommunity1PathAbs = `${__dirname}/${logCommunity1Path}`;
                    const summaryCommunity1Path = path.join(community1Path, `summary.json`);
                    const summaryCommunity1PathAbs = `${__dirname}/${summaryCommunity1Path}`;

                    const modelOutPath = modelConvertedModelsDirPath;
                    const glbOutputPath = path.join(modelOutPath, `model.glb`);
                    const glbOutputPathAbs = `${__dirname}/${glbOutputPath}`;
                    const jsonOutputPath = path.join(modelOutPath, `model.json`);
                    const jsonOutputPathAbs = `${__dirname}/${jsonOutputPath}`;
                    const xktEnterprise1Path = path.join(modelOutPath, `model.xkt`);
                    const xktEnterprise1PathAbs = `${__dirname}/${xktEnterprise1Path}`;
                    const logEnterprise1Path = path.join(modelOutPath, `log.txt`);
                    const logPath = `${__dirname}/${logEnterprise1Path}`;
                    const jsonManifestPath = path.join(modelOutPath, `model.glb.manifest.json`);
                    const xktManifestPath = path.join(modelOutPath, `model.xkt.manifest.json`);

                    if (errors[ifcInputPath]) {
                        // TODO
                        console.log(errors[ifcInputPath])
                    } else {

                        conversionResultsHTML.push(`@@include('../../_includes/ifc/ifc-modelConversionResults.html', { 
                            "batchId": "${inputBatchDir}", 
                            "modelId": "${inputFileName}", 
                            "sourceFileSize": "${ifcSizes[ifcInputPath]}", 
                            "xktFileSize":"${xktSizes[ifcInputPath]}", 
                            "conversionTime": "${conversionTimes[ifcInputPath]}",
                            "attributionPath": "",
                            "logPath": "${convertedModelsDir}/projects/${inputBatchDir}/models/${inputFileName}/log.txt",
                            "modelLinkPath": "${convertedModelsDir}/projects/${inputBatchDir}/models/${inputFileName}/model.xkt.manifest.json"
                        })`);

                        batchData.models[inputFileName] = {
                            pipelineId: "CxConverter1",
                            batchId: inputBatchDir,
                            modelId: inputFileName,
                            ifcFileSize: ifcSizes[ifcInputPath],
                            xktFileSize: xktSizes[ifcInputPath],
                            conversionTime: conversionTimes[ifcInputPath],
                            manifestPath: `./convertedModels/ifc/projects/${inputBatchDir}/models/${inputFileName}/model.xkt.manifest.json`,
                            logPath: `./convertedModels/ifc/projects/${inputBatchDir}/models/${inputFileName}/log.txt`
                        }

                        projectIndex.models.push({
                            id: `${inputFileName}`,
                            name: `${inputFileName}`,
                            manifest: "model.xkt.manifest.json"
                        });
                    }
                }
                fs.writeFileSync(`${outputBatchDirPath}/index.json`, JSON.stringify(projectIndex), {encoding: 'utf8'});
            }
        }

        conversionResultsHTML.push(`</tbody></table></div></div></div></section>`);

        fs.writeFileSync("./_includes/ifc/ifc-conversionResults.html", conversionResultsHTML.join("\n"), {encoding: 'utf8'});
        fs.writeFileSync("./convertedModels/ifc/systemInfo.json", JSON.stringify(systemInfo), {encoding: 'utf8'});
        fs.writeFileSync("./convertedModels/ifc/index.json", JSON.stringify(convertedModelsIndex), {encoding: 'utf8'});
        fs.writeFileSync("./convertedModels/ifc/kdtree.json", JSON.stringify(kdTree.root), {encoding: 'utf8'});
        fs.copyFileSync(`${configs.convert2xkt.path}/convert2xkt.conf.json`, `./convertedModels/ifc/convert2xkt.conf.json`);
        console.log("HTML test page written.");
    } catch (e) {
        console.error("[Error] ", e);
    }

})();