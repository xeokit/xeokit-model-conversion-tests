const fs = require("fs");
const path = require("path");
const execSync = require('child_process').execSync;
const si = require('systeminformation');
const axios = require('axios');

const {ChartJSNodeCanvas} = require('chartjs-node-canvas');

const inputFilesDir = "./inputFiles/";
const resultsDir = "./results/";

const configsData = fs.readFileSync("./convertconfig.json");
const configs = JSON.parse(configsData);

const ifcSizes = {};
const xktSizes = {};
const conversionTimes = {};
const ifcAttributionPaths = {};
const errors = {};

(async () => {
    try {

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

        fs.writeFileSync("./_includes/ifc2gltfOptions.html",
            `@@include('../_includes/ifc2gltfOptionsCard.html', { 
            "ifc2gltfFileSize":"${configs.ifc2gltf.options.s}",
            "ifc2gltfTileSize":"${configs.ifc2gltf.options.t}"
            })`);

        fs.writeFileSync("./_includes/cliInvocation.html",
            `@@include('../_includes/cliInvocationCard.html', { 
            "ifc2gltfFileSize":"${configs.ifc2gltf.options.s}",
            "ifc2gltfTileSize":"${configs.ifc2gltf.options.t}"
            })`);

        fs.writeFileSync("./results/systemInfo.json", JSON.stringify(systemInfo, null, "\t"), {encoding: 'utf8'});

        fs.writeFileSync("./_includes/systemInfo.html",
            `@@include('../_includes/systemInfoCard.html', { 
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
            "cxConverterVersion": "${cxConvertVersion}"
            })`);

        const inputBatchDirs = await fs.promises.readdir(inputFilesDir);


        for (const inputBatchDir of inputBatchDirs) { // BIMData, IfcOpenShell etc

            if (inputBatchDir.startsWith("_")) {
                continue;
            }

            const inputBatchDirPath = path.join(inputFilesDir, inputBatchDir);
            const isDir = fs.lstatSync(inputBatchDirPath).isDirectory();

            if (isDir) {
                console.log("Converting batch: " + inputBatchDirPath);
                const outputBatchDirPath = path.join(resultsDir, inputBatchDir);
                if (fs.existsSync(outputBatchDirPath)) {
                    fs.rmSync(outputBatchDirPath, {recursive: true, force: true});
                }
                fs.mkdirSync(outputBatchDirPath);

                const inputFiles = await fs.promises.readdir(inputBatchDirPath);

                const attributionPath = `${__dirname}/${path.join(inputBatchDirPath, `attribution.json`)}`;
                const attributionData = JSON.parse(fs.readFileSync(attributionPath));

                for (const inputFile of inputFiles) {  // foo.ifc, bar.ifc

                    const ext = inputFile.split('.').pop();

                    if (ext !== "ifc") {
                        continue;
                    }

                    console.log("Converting file: " + inputFile);

                    const inputFileName = path.parse(inputFile).name;
                    const inputFilePath = `${__dirname}/${path.join(inputBatchDirPath, inputFile)}`;
                    const modelResultsDirPath = `${outputBatchDirPath}/${inputFileName}/`;
                    const modelOutPath = `${modelResultsDirPath}/ifcCXConverterPipeline1`;
                    const glbPath = path.join(modelOutPath, `model.glb`);
                    const glbPathAbs = `${__dirname}/${glbPath}`;
                    const jsonPath = path.join(modelOutPath, `model.json`);
                    const jsonPathAbs = `${__dirname}/${jsonPath}`;
                    const xktEnterprise1Path = path.join(modelOutPath, `model.xkt`);
                    const xktEnterprise1PathAbs = `${__dirname}/${xktEnterprise1Path}`;
                    const logEnterprise1Path = path.join(modelOutPath, `log.txt`);
                    const logPath = `${__dirname}/${logEnterprise1Path}`;
                    const jsonManifestPath = path.join(modelOutPath, `model.glb.manifest.json`);
                    const xktManifestPath = path.join(modelOutPath, `model.xkt.manifest.json`);

                    if (fs.existsSync(modelResultsDirPath)) {
                        fs.rmSync(modelResultsDirPath, {recursive: true, force: true});
                    }

                    fs.mkdirSync(modelResultsDirPath);
                    fs.mkdirSync(modelOutPath);

                    ifcSizes[inputFilePath] = (getFileSize(inputFilePath) / 1000000).toFixed(4);

                    const startTime = performance.now();

                    try {
                        const ifc2gltfCmd = `${configs.ifc2gltf.path} \
                        -i ${inputFilePath} \
                        -o ${glbPathAbs} \
                        -m ${jsonPathAbs} \
                        -s ${configs.ifc2gltf.options.s} \
                        -t ${configs.ifc2gltf.options.t} \
                        -e 3 >> ${logPath}`;

                        fs.appendFileSync(logEnterprise1Path, ifc2gltfCmd + "\n");

                        execSync(ifc2gltfCmd, {stdio: 'inherit'});

                        const convert2xktCmd = `node --max-old-space-size=14000 \
                        ${configs.convert2xkt.path} -t \
                        -n \
                        -a ${jsonManifestPath} \
                        -o ${xktManifestPath} \
                        -l >> ${logPath}`;

                        fs.appendFileSync(logEnterprise1Path, convert2xktCmd + "\n\n");

                        execSync(convert2xktCmd, {stdio: 'inherit'});

                        xktSizes[inputFilePath] = (getXKTSize(modelOutPath, `model.xkt.manifest.json`) / 1000000).toFixed(4);

                        console.log("xktSize = " + xktSizes[inputFilePath])
                    } catch (e) {
                        xktSizes[inputFilePath] = 0;
                        errors[inputFilePath] = e;
                    }

                    const endTime = performance.now();
                    conversionTimes[inputFilePath] = ((endTime - startTime) / 1000).toFixed(2);

                    ifcAttributionPaths[inputFilePath] = attributionData.link;
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

        conversionResultsHTML.push(`<section class="test-results-section">
                    <div class="container pt-6 pb-0">
                        <div class="row">
                            <div class="col-lg-12">
                                <table class="table table-sm table-hover  table-bordered mb-0">
                                <tr style="background-color: rgba(0, 0, 0, 0.05);"><th>IFC File</th><th style="text-align:right;">IFC Size (Mb)</th><th style="text-align:right;">XKT Size (Mb)</th><th style="text-align:right;">Conversion Time (Secs)</th><th style="text-align:center;" colspan="2">View Results</th></tr>
                                <tbody>`);

        for (const inputBatchDir of inputBatchDirs) { // BIMData, IfcOpenShell etc
            if (inputBatchDir.startsWith("_")) {
                continue;
            }
            const inputBatchDirPath = path.join(inputFilesDir, inputBatchDir);
            const isDir = fs.lstatSync(inputBatchDirPath).isDirectory();
            if (isDir) {
                const outputBatchDirPath = path.join(resultsDir, inputBatchDir);
                conversionResultsHTML.push(`<tr style="height: 60px; vertical-align:bottom; background-color: rgba(0, 0, 0, 0.05);"><td style="font-size: larger; height: 60px; vertical-align:bottom;" ><b>${inputBatchDir}</td><td></td><td></td><td></td><td colspan="2"></td></tr>`);
                const inputFiles = await fs.promises.readdir(inputBatchDirPath);
                for (const inputFile of inputFiles) {  // foo.ifc, bar.ifc
                    const ext = inputFile.split('.').pop();
                    if (ext !== "ifc") {
                        continue;
                    }
                    console.log("Converting file: " + inputFile);
                    const inputFileName = path.parse(inputFile).name;
                    const inputFilePath = `${__dirname}/${path.join(inputBatchDirPath, inputFile)}`;
                    const modelResultsDirPath = `${outputBatchDirPath}/${inputFileName}/`;
                    const community1Path = `${modelResultsDirPath}/ifcCommunityPipeline1`;
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

                    const modelOutPath = `${modelResultsDirPath}/ifcCXConverterPipeline1`;
                    const glbPath = path.join(modelOutPath, `model.glb`);
                    const glbPathAbs = `${__dirname}/${glbPath}`;
                    const jsonPath = path.join(modelOutPath, `model.json`);
                    const jsonPathAbs = `${__dirname}/${jsonPath}`;
                    const xktEnterprise1Path = path.join(modelOutPath, `model.xkt`);
                    const xktEnterprise1PathAbs = `${__dirname}/${xktEnterprise1Path}`;
                    const logEnterprise1Path = path.join(modelOutPath, `log.txt`);
                    const logPath = `${__dirname}/${logEnterprise1Path}`;
                    const jsonManifestPath = path.join(modelOutPath, `model.glb.manifest.json`);
                    const xktManifestPath = path.join(modelOutPath, `model.xkt.manifest.json`);

                    if (errors[inputFilePath]) {
                        // TODO
                    } else {
                        conversionResultsHTML.push(`@@include('../_includes/modelConversionResults.html', { 
                            "batchId": "${inputBatchDir}", 
                            "modelId": "${inputFileName}", 
                            "sourceFileSize": "${ifcSizes[inputFilePath]}", 
                            "xktFileSize":"${xktSizes[inputFilePath]}", 
                            "conversionTime": "${conversionTimes[inputFilePath]}",
                            "attributionPath": "${ifcAttributionPaths[inputFilePath]}",
                            "logPath": "./results/${inputBatchDir}/${inputFileName}/ifcCXConverterPipeline1/log.txt"
                        })`);
                    }
                }
            }
        }

        conversionResultsHTML.push(`</tbody></table></div></div></div></section>`);

        fs.writeFileSync("./_includes/conversionResults.html", conversionResultsHTML.join("\n"), {encoding: 'utf8'});

        console.log("HTML test page written.");

    } catch (e) {
        console.error("[Error] ", e);
    }


//-------------------------------------------------------------
    // Plot a chart
    //--------------------------------------------------------------


    async function createGraph() {
        const ifcSizesList = Object.values(ifcSizes);
        const xktSizesList = Object.values(xktSizes);
        const conversionTimesList = Object.values(conversionTimes)
        const width = 800; //px
        const height = 400; //px
        const backgroundColour = 'white'; // Uses https://www.w3schools.com/tags/canvas_fillstyle.asp
        const chartJSNodeCanvas = new ChartJSNodeCanvas({width, height, backgroundColour});
        const dataUrl = await chartJSNodeCanvas.renderToDataURL({
            type: 'line',   // for line chart
            data: {
                labels: ifcSizesList,
                datasets: [
                    {
                        label: "XKT Sizes (Mb)",
                        data: xktSizesList,
                        fill: false,
                        borderColor: ['rgb(51, 204, 204)'],
                        borderWidth: 1,
                        xAxisID: 'xAxis1' //define top or bottom axis ,modifies on scale
                    }
                    // ,
                    //     {
                    //         label: "Conversion Times (Secs)",
                    //         data: conversionTimesList,
                    //         fill: false,
                    //         borderColor: ['rgb(255, 102, 255)'],
                    //         borderWidth: 1,
                    //         xAxisID: 'xAxis1'
                    //     },
                ],
            },
            options: {
                scales: {
                    y: {
                        suggestedMin: 0,
                    }
                }
            }
        });
        const base64Image = dataUrl
        var base64Data = base64Image.replace(/^data:image\/png;base64,/, "");
        fs.writeFile("graph.png", base64Data, 'base64', function (err) {
            if (err) {
                console.log(err);
            }
        });
        return dataUrl;
    }

    await createGraph();

})();