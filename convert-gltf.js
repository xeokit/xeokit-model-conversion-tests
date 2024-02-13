const fs = require("fs");
const path = require("path");
const execSync = require('child_process').execSync;
const si = require('systeminformation');
const axios = require('axios');


const configsData = fs.readFileSync("./convertconfig.json");
const configs = JSON.parse(configsData);

const inputFilesDir = "./inputFiles/gltf/";
const convertedModelsDir = "./convertedModels/gltf/";
const convertedProjectsDir = "./convertedModels/gltf/projects/";

const gltfSizes = {};
const xktSizes = {};
const conversionTimes = {};
const gltfAttributionPaths = {};
const errors = {};

(async () => {
    try {

        if (!fs.existsSync(convertedProjectsDir)) {
            fs.mkdirSync(convertedProjectsDir);
        }

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

        // const browser = await puppeteer.launch({ headless: false });
        // const browserPage = await browser.newPage();

        const xeokitVersion = await fetchPackageVersion('@xeokit/xeokit-sdk');
        const xeokitConvertVersion = await fetchPackageVersion('@xeokit/xeokit-convert');

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

        fs.writeFileSync("./_includes/gltf/gltf-gltf2gltfOptions.html",
            `@@include('../../_includes/gltf/gltf-gltf2gltfOptionsCard.html', { 
            "gltf2gltfFileSize":"na",
            "gltf2gltfTileSize":"na"
            })`);

        fs.writeFileSync("./_includes/gltf/gltf-cliInvocation.html",
            `@@include('../../_includes/gltf/gltf-cliInvocationCard.html', { 
            "gltf2gltfFileSize":"na",
            "gltf2gltfTileSize":"na"
            })`);

        fs.writeFileSync(`${convertedModelsDir}/systemInfo.json`, JSON.stringify(systemInfo, null, "\t"), {encoding: 'utf8'});

        fs.writeFileSync("./_includes/gltf/gltf-systemInfo.html",
            `@@include('../../_includes/gltf/gltf-systemInfoCard.html', { 
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
            "xeokitConvertVersion": "${xeokitConvertVersion}"
            })`);

        const inputBatchDirs = await fs.promises.readdir(inputFilesDir);


        for (const inputBatchDir of inputBatchDirs) { // BIMData, IfcOpenShell etc

            if (inputBatchDir.startsWith("_")) {
                continue;
            }

            const inputBatchDirPath = path.join(inputFilesDir, inputBatchDir);
            const isDir = fs.lstatSync(inputBatchDirPath).isDirectory();

            if (isDir) {
                console.log("Converting LAS batch: " + inputBatchDirPath);
                const outputBatchDirPath = path.join(convertedProjectsDir, inputBatchDir);
                if (fs.existsSync(outputBatchDirPath)) {
                    fs.rmSync(outputBatchDirPath, {recursive: true, force: true});
                }
                fs.mkdirSync(outputBatchDirPath);

                const inputFiles = await fs.promises.readdir(inputBatchDirPath);

                //     const attributionPath = `${__dirname}/${path.join(inputBatchDirPath, `attribution.json`)}`;
                //      const attributionData = JSON.parse(fs.readFileSync(attributionPath));

                const convertedModelSetDir = `${outputBatchDirPath}/models/`;
                if (fs.existsSync(convertedModelSetDir)) {
                    fs.rmSync(convertedModelSetDir, {recursive: true, force: true});
                }
                fs.mkdirSync(convertedModelSetDir);

                for (const inputFile of inputFiles) {  // foo.gltf, bar.gltf

                    console.log("Found file: " + inputFile);

                    const ext = inputFile.split('.').pop();

                    if (ext !== "gltf" && ext !== "glb") {
                        continue;
                    }

                    console.log("Converting file: " + inputFile);

                    const inputFileName = path.parse(inputFile).name;
                    const gltfInputPath = `${__dirname}/${path.join(inputBatchDirPath, inputFile)}`;
                    const convertedModelDir = `${outputBatchDirPath}/models/${inputFileName}/`;
                    const modelOutPath = convertedModelDir;

                    const xktOutputPath = path.join(modelOutPath, `geometry.xkt`);
                    // const glbOutputPath = path.join(modelOutPath, `model.glb`);
                    // const jsonOutputPath = path.join(modelOutPath, `model.json`);
                     const logPath = path.join(modelOutPath, `log.txt`);
                    //
                    // const jsonManifestPath = path.join(modelOutPath, `model.glb.manifest.json`);
                    // const xktManifestPath = path.join(modelOutPath, `geometry.xkt.manifest.json`);

                    if (fs.existsSync(convertedModelDir)) {
                        fs.rmSync(convertedModelDir, {recursive: true, force: true});
                    }
                    fs.mkdirSync(convertedModelDir);

                    if (fs.existsSync(modelOutPath)) {
                        fs.rmSync(modelOutPath, {recursive: true, force: true});
                    }
                    fs.mkdirSync(modelOutPath);

                    gltfSizes[gltfInputPath] = (getFileSize(gltfInputPath) / 1000000).toFixed(4);

                    const startTime = performance.now();

                    try {

                        const convert2xktCmd = `node --max-old-space-size=18076 \
                        ${configs.convert2xkt.path}/convert2xkt.js  -t \
                        -c ${configs.convert2xkt.path}/convert2xkt.conf.json \
                        -s ${gltfInputPath} \
                        -o ${xktOutputPath} \
                        -l >> ${logPath}`;

                        fs.appendFileSync(logPath, convert2xktCmd + "\n\n");

                        execSync(convert2xktCmd, {stdio: 'inherit'});

                        console.log(convert2xktCmd)

                    //    xktSizes[gltfInputPath] = (getXKTSize(modelOutPath, `geometry.xkt.manifest.json`) / 1000000).toFixed(4);

                        xktSizes[gltfInputPath] = 0;

                        console.log("xktSize = " + xktSizes[gltfInputPath])

                    } catch (e) {
                        console.log(e);
                        xktSizes[gltfInputPath] = 0;
                        errors[gltfInputPath] = e;
                    }

                    const endTime = performance.now();
                    conversionTimes[gltfInputPath] = ((endTime - startTime) / 1000).toFixed(2);

                    //        gltfAttributionPaths[gltfInputPath] = attributionData.link;

                }
            }
        }

        // fs.writeFileSync("./convertFiles.sh", script.join("\n\n"), {encoding: 'utf8'});
        //
        // console.log("Converting files...");
        //

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
                                <tr style="background-color: rgba(0, 0, 0, 0.05);"><th>gltf File</th><th style="text-align:right;">gltf Size (Mb)</th><th style="text-align:right;">XKT Size (Mb)</th><th style="text-align:right;">Conversion Time (Secs)</th><th style="text-align:center;" colspan="5">Converted XKT</th></tr>
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
                for (const inputFile of inputFiles) {  // foo.gltf, bar.gltf
                    const ext = inputFile.split('.').pop();
                    if (ext !== "gltf" && ext !== "glb") {
                        continue;
                    }
                    console.log("Converting file: " + inputFile);
                    const inputFileName = path.parse(inputFile).name;
                    const gltfInputPath = `${__dirname}/${path.join(inputBatchDirPath, inputFile)}`;
                    const modelConvertedModelsDirPath = `${outputBatchDirPath}/models/${inputFileName}/`;
                    const community1Path = `${modelConvertedModelsDirPath}/gltfCommunityPipeline1`;
                    const glbCommunity1Path = path.join(community1Path, `model.glb`);
                    const glbCommunity1PathAbs = `${__dirname}/${glbCommunity1Path}`;
                    const jsonCommunity1Path = path.join(community1Path, `model.json`);
                    const jsonCommunity1PathAbs = `${__dirname}/${jsonCommunity1Path}`;
                    const xktCommunity1Path = path.join(community1Path, `geometry.xkt`);
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
                    const xktEnterprise1Path = path.join(modelOutPath, `geometry.xkt`);
                    const xktEnterprise1PathAbs = `${__dirname}/${xktEnterprise1Path}`;
                    const logEnterprise1Path = path.join(modelOutPath, `log.txt`);
                    const logPath = `${__dirname}/${logEnterprise1Path}`;
                    const jsonManifestPath = path.join(modelOutPath, `model.glb.manifest.json`);
                    const xktManifestPath = path.join(modelOutPath, `geometry.xkt.manifest.json`);

                    if (errors[gltfInputPath]) {
                        // TODO
                        console.log("ERROR = " + errors[gltfInputPath])
                    } else {

                        conversionResultsHTML.push(`@@include('../../_includes/gltf/gltf-modelConversionResults.html', { 
                            "batchId": "${inputBatchDir}", 
                            "modelId": "${inputFileName}", 
                            "sourceFileSize": "${gltfSizes[gltfInputPath]}", 
                            "xktFileSize":"${xktSizes[gltfInputPath]}", 
                            "conversionTime": "${conversionTimes[gltfInputPath]}",
                            "attributionPath": "",
                            "logPath": "${convertedModelsDir}/projects/${inputBatchDir}/models/${inputFileName}/log.txt",
                            "modelLinkPath": "${convertedModelsDir}/projects/${inputBatchDir}/index.json"
                        })`);

                        batchData.models[inputFileName] = {
                            pipelineId: "CxConverter1",
                            batchId: inputBatchDir,
                            modelId: inputFileName,
                            gltfFileSize: gltfSizes[gltfInputPath],
                            xktFileSize: xktSizes[gltfInputPath],
                            conversionTime: conversionTimes[gltfInputPath],
                            manifestPath: `./convertedModels/gltf/projects/${inputBatchDir}/models/${inputFileName}/geometry.xkt.manifest.json`,
                            logPath: `./convertedModels/gltf/projects/${inputBatchDir}/models/${inputFileName}/log.txt`
                        }

                        projectIndex.models.push({
                            id: `${inputFileName}`,
                            name: `${inputFileName}`
                        });
                    }
                }

                fs.writeFileSync(`${outputBatchDirPath}/index.json`, JSON.stringify(projectIndex), {encoding: 'utf8'});
            }
        }

        conversionResultsHTML.push(`</tbody></table></div></div></div></section>`);

        fs.writeFileSync("./_includes/gltf/gltf-conversionResults.html", conversionResultsHTML.join("\n"), {encoding: 'utf8'});
        fs.writeFileSync("./convertedModels/gltf/systemInfo.json", JSON.stringify(systemInfo), {encoding: 'utf8'});
        fs.writeFileSync("./convertedModels/gltf/index.json", JSON.stringify(convertedModelsIndex), {encoding: 'utf8'});

        console.log(`copying ${configs.convert2xkt.path}/convert2xkt.conf.json -> ./convertedModels/gltf/convert2xkt.conf.json`);

        fs.copyFileSync(`${configs.convert2xkt.path}/convert2xkt.conf.json`, `./convertedModels/gltf/convert2xkt.conf.json`);

        console.log("HTML test page written.");

    } catch (e) {
        console.error("[Error] ", e);
    }

})();