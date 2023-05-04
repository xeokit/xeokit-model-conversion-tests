const log = console.log;

/**
 * Overwrites the console.log function to add a timestamp to the log.
 * https://stackoverflow.com/a/36887315
 */
console.log = function () {
    const first_parameter = arguments[0];
    const other_parameters = Array.prototype.slice.call(arguments, 1);

    function formatConsoleDate (date) {
        const hour = date.getHours();
        const minutes = date.getMinutes();
        const seconds = date.getSeconds();
        const milliseconds = date.getMilliseconds();

        return '[' +
            ((hour < 10) ? '0' + hour: hour) +
            ':' +
            ((minutes < 10) ? '0' + minutes: minutes) +
            ':' +
            ((seconds < 10) ? '0' + seconds: seconds) +
            '.' +
            ('00' + milliseconds).slice(-3) +
            '] ';
    }

    log.apply(console, [formatConsoleDate(new Date()) + first_parameter].concat(other_parameters));
};


const fs = require("fs");
const path = require("path");
const execSync = require('child_process').execSync;
const si = require('systeminformation');

const inputFilesDir = "./inputFiles/";
const resultsDir = "./results/";

const configsData = fs.readFileSync("./convertconfig.json");
const configs = JSON.parse(configsData);

/**
 * The tools used in the conversion pipelines.
 * @type {{ifc2gltf: any, ifcConvert: *, convert2xkt: any, xeokitMetadata: *}}
 */
const tools = {
    ifcConvert: configs.paths["IfcConvert"],
    xeokitMetadata: configs.paths["xeokit-metadata"],
    convert2xkt: configs.paths["convert2xkt"],
    ifc2gltf: configs.paths["ifc2gltf"],
}

let totalConversions = 0;
let ifcFilesCount = 0;

const date = new Date();

const conversionResultsHTML = [];

/**
 * Checks if all CLI tools are installed.
 * @returns {boolean} True if all tools are installed, false otherwise.
 */
function allToolsAreInstalled() {
    console.log("Checking if all tools are installed...");
    console.log(" - IfcConvert: " + fs.existsSync(tools.ifcConvert));
    console.log(" - xeokit-metadata: " + fs.existsSync(tools.xeokitMetadata));
    console.log(" - convert2xkt: " + fs.existsSync(tools.convert2xkt));
    console.log(" - ifc2gltf: " + fs.existsSync(tools.ifc2gltf));
    return fs.existsSync(tools.ifcConvert) && fs.existsSync(tools.xeokitMetadata) &&
        fs.existsSync(tools.convert2xkt) && fs.existsSync(tools.ifc2gltf);
}

async function logSystemInfo() {
    const systemInfo = {
        version: si.version(),
        time: await si.time(),
        system: si.system(),
        cpu: await si.cpu(),
        mem: await si.mem(),
        graphics: await si.graphics(),
        os: await si.osInfo()
    };

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
            "nodeVersion": "${process.version}"
            })`);
}

/**
 * Add the header of the HTML table to the conversionResultsHTML.
 * @param inputBatchDir
 */
function addHtmlTableHeader(inputBatchDir) {
    conversionResultsHTML.push(`<section class="test-results-section">
    <div class="container pt-6 pb-0">
        <div class="row">
            <div class="col-lg-12">
                <h2>${inputBatchDir}</h1>
            </div>
        </div>
        <div class="row">
            <div class="col-lg-12">
                <table class="table table-sm table-hover table-striped table-bordered mb-0">
                    <tbody>`);
}

/**
 * Add the footer of the HTML table to the conversionResultsHTML.
 */
function addHtmlTableFooter() {
    conversionResultsHTML.push(`</tbody>
                </table>
            </div>
        </div>
    </div>
</section>`);
}

/**
 * Runs the conversion pipeline that uses only open source tools (IfcConvert, xeokit-metadata & convert2xkt).
 * @param modelResultsDirPath The path to the directory where the results of the conversion will be written.
 * @param inputFile The name of the input file.
 * @param inputFilePath The path to the input file.
 * @param conversionSummary The summary of the conversion.
 */
function runCommunityPipeline(modelResultsDirPath, inputFile, inputFilePath, conversionSummary) {

    const pipelineName = "CommunityPipeline";

    let startDate = new Date();

    console.log(` - Running pipeline: ${pipelineName}`);

    const pipelineResultsPath = `${modelResultsDirPath}/${pipelineName}`;

    const glbPath = path.join(pipelineResultsPath, `model.glb`);
    const glbPathAbs = `${__dirname}/${glbPath}`;
    const jsonPath = path.join(pipelineResultsPath, `model.json`);
    const jsonPathAbs = `${__dirname}/${jsonPath}`;
    const xktPath = path.join(pipelineResultsPath, `model.xkt`);
    const xktPathAbs = `${__dirname}/${xktPath}`;
    const logPath = path.join(pipelineResultsPath, `log.txt`);
    const logPathAbs = `${__dirname}/${logPath}`;

    let glbConvertedOK = false;
    let xktConvertedOK = false;
    let jsonConvertedOK = false;

    let xktManifest = {
        xktFiles: [],
        glbFiles: [],
        metadataFiles: []
    };

    console.log(` - Logging to: ${logPath}`);

    fs.mkdirSync(pipelineResultsPath);
    fs.writeFileSync(logPathAbs, `#----------------------------------------------------------------------------
# Community IFC Conversion Pipeline Log
#
# ${date}
#
# Converting file: ${inputFile}
# Using tools: IfcConvert, xeokit-metadata and convert2xkt
# More info: 
# - https://xeokit.notion.site/Converting-IFC-Models-to-XKT-using-Open-Source-Tools-A-Simpler-Pipeline-02d45ba457eb4f808f63bcacb71a4fb3
#----------------------------------------------------------------------------\n`, {encoding: 'utf8'});

    try {
        fs.appendFileSync(logPathAbs, `\n\n# IfcConvert\n\n${tools.ifcConvert} ${inputFilePath} ${glbPathAbs} --use-element-guids --no-progress  --force-space-transparency 0.4\n`);
        execSync(`${tools.ifcConvert} ${inputFilePath} ${glbPathAbs} --use-element-guids --no-progress --force-space-transparency 0.4 -v >> ${logPathAbs}`, {stdio: 'inherit'});

        xktManifest.glbFiles.push(glbPathAbs.replace(/^.*[\\\/]/, ''));
        glbConvertedOK = true;

        fs.appendFileSync(logPathAbs, `\n\n# xeokit-metadata\n\n${tools.xeokitMetadata} ${inputFilePath} ${jsonPathAbs}\n`);
        execSync(`${tools.xeokitMetadata} ${inputFilePath} ${jsonPathAbs} >> ${logPathAbs}`, {stdio: 'inherit'});

        xktManifest.metadataFiles.push(jsonPathAbs.replace(/^.*[\\\/]/, ''));
        jsonConvertedOK = true;

        fs.appendFileSync(logPathAbs, `\n\n# convert2xkt\n\nnode ${tools.convert2xkt} -s ${glbPathAbs} -m ${jsonPathAbs} -o ${xktPathAbs} -l\n`);
        execSync(`node --max-old-space-size=12000 ${tools.convert2xkt} -s ${glbPathAbs} -m ${jsonPathAbs} -o ${xktPathAbs} -l >> ${logPathAbs}`, {stdio: 'inherit'});

        xktManifest.xktFiles.push(xktPathAbs.replace(/^.*[\\\/]/, ''));
        xktConvertedOK = true;

        let endDate = new Date();
        let duration = endDate.getTime() - startDate.getTime();

        console.log(` - Finished pipeline '${pipelineName}' in ${duration} ms`);

    } catch (e) {
        fs.appendFileSync(logPathAbs, `\n\n[Error]: ${e}\n`);
        console.error(e);
    }

    conversionSummary.pipelines[pipelineName] = {
        "xktConvertedOK": xktConvertedOK,
        "glbConvertedOK": glbConvertedOK,
        "jsonConvertedOK": jsonConvertedOK,
        "xktManifest": xktManifest
    };
}

/**
 * Runs the conversion pipeline that uses closed source (ifc2gltf) and open source tools (convert2xkt).
 * @param modelResultsDirPath The path to the directory where the results of the conversion will be written.
 * @param inputFile The name of the input file.
 * @param inputFilePath The path to the input file.
 * @param conversionSummary The conversion summary object.
 */
function runCxConverterPipeline(modelResultsDirPath, inputFile, inputFilePath, conversionSummary) {

    const pipelineName = "CxConverterPipeline";

    let startDate = new Date();

    console.log(` - Running pipeline: ${pipelineName}`);

    const pipelineResultsPath = `${modelResultsDirPath}/${pipelineName}`;

    const manifestPath = path.join(pipelineResultsPath, `model.glb.manifest.json`);

    const glbPath = path.join(pipelineResultsPath, `model.glb`);
    const glbPathAbs = `${__dirname}/${glbPath}`;
    const jsonPath = path.join(pipelineResultsPath, `model.json`);
    const jsonPathAbs = `${__dirname}/${jsonPath}`;
    const logPath = path.join(pipelineResultsPath, `log.txt`);
    const logPathAbs = `${__dirname}/${logPath}`;

    let glbConvertedOK = false;
    let xktConvertedOK = false;
    let jsonConvertedOK = false;

    let xktManifest = {
        xktFiles: [],
        glbFiles: [],
        metadataFiles: []
    };

    console.log(` - Logging to: ${logPath}`);

    fs.mkdirSync(pipelineResultsPath);
    fs.writeFileSync(logPathAbs, `#----------------------------------------------------------------------------
# CxConverter IFC Conversion Pipeline Log
#
# Converting file: ${inputFile}
# Using tools: ifc2gltf and convert2xkt
# Date: ${date}
# More info:
# - https://xeokit.notion.site/Converting-IFC-to-XKT-using-ifc2gltf-a2e0005d00dc4f22b648f1237bc3245d 
#----------------------------------------------------------------------------\n\n`, {encoding: 'utf8'});

    try {
        fs.appendFileSync(logPathAbs, `\n\n# ifc2gltf\n\n${tools.ifc2gltf} -s 5 -i ${inputFilePath} -o ${glbPathAbs} -m ${jsonPathAbs}\n`);
        execSync(`${tools.ifc2gltf} -s 5 -i ${inputFilePath} -o ${glbPathAbs} -m ${jsonPathAbs} >> ${logPathAbs}`, {stdio: 'inherit'});
        glbConvertedOK = true;
    } catch (e) {
        fs.appendFileSync(logPathAbs, `\n\n[Error]: ${e}\n`);
    }

    try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath));
        const gltfOutFiles = manifest.gltfOutFiles || [];
        const metadataOutFiles = manifest.metadataOutFiles || [];

        for (let i = 0, len = gltfOutFiles.length; i < len; i++) {

            const gltfFilePath = gltfOutFiles[i]; // Absolute
            const metadataFilePath = metadataOutFiles[i]; // Absolute
            const xktFilePath = gltfFilePath + ".xkt";

            xktManifest.glbFiles.push(gltfFilePath.replace(/^.*[\\\/]/, ''));
            xktManifest.metadataFiles.push(metadataFilePath.replace(/^.*[\\\/]/, ''));
            xktManifest.xktFiles.push(xktFilePath.replace(/^.*[\\\/]/, ''));

            try {
                fs.appendFileSync(logPathAbs, `\n\n# convert2xkt\n\n${tools.convert2xkt} -s ${gltfFilePath} -m ${metadataFilePath} -o ${xktFilePath} -l \n`);
                execSync(`node --max-old-space-size=24000 ${tools.convert2xkt} -s ${gltfFilePath} -m ${metadataFilePath} -o ${xktFilePath} -l >> ${logPathAbs}`, {stdio: 'inherit'});
                xktConvertedOK = true;
                jsonConvertedOK = true;
            } catch (e) {
                fs.appendFileSync(logPathAbs, `\n\n[Error]: ${e}\n`);
            }
        }

    } catch (e) {
        fs.appendFileSync(logPathAbs, `Error parsing manifest JSON: ${e}`);
        console.error("Error parsing manifest JSON: " + e);
    }

    let endDate = new Date();
    let duration = endDate.getTime() - startDate.getTime();

    console.log(` - Finished pipeline '${pipelineName}' in ${duration} ms`);

    conversionSummary.pipelines[pipelineName] = {
        "xktConvertedOK": xktConvertedOK,
        "glbConvertedOK": glbConvertedOK,
        "jsonConvertedOK": jsonConvertedOK,
        "xktManifest": xktManifest
    };
}

/**
 * Runs the latest conversion pipeline that uses only open source tools (convert2xkt).
 * @param modelResultsDirPath The path to the directory where the results of the conversion will be written.
 * @param inputFile The name of the input file.
 * @param inputFilePath The path to the input file.
 * @param conversionSummary The conversion summary object.
 */
function runMultiFormatPipeline(modelResultsDirPath, inputFile, inputFilePath, conversionSummary) {

    const pipelineName = "MultiFormatPipeline";

    let startDate = new Date();

    console.log(` - Running pipeline: ${pipelineName}`);

    const pipelineResultsPath = `${modelResultsDirPath}/${pipelineName}`;

    const xktPath = path.join(pipelineResultsPath, `model.xkt`);
    const xktPathAbs = `${__dirname}/${xktPath}`;
    const logPath = path.join(pipelineResultsPath, `log.txt`);
    const logPathAbs = `${__dirname}/${logPath}`;

    let glbConvertedOK = false;
    let xktConvertedOK = false;
    let jsonConvertedOK = false;

    let xktManifest = {
        xktFiles: [],
        glbFiles: [],
        metadataFiles: []
    };

    console.log(` - Logging to: ${logPath}`);

    fs.mkdirSync(pipelineResultsPath);
    fs.writeFileSync(logPathAbs, `#----------------------------------------------------------------------------
# Multi-Format Conversion Pipeline Log
#
# Converting file: ${inputFile}
# Using tools: convert2xkt
# Date: ${date}
# More info:
# - https://xeokit.notion.site/Converting-Models-to-XKT-with-convert2xkt-fa567843313f4db8a7d6535e76da9380
#----------------------------------------------------------------------------\n\n`, {encoding: 'utf8'});

    try {
        fs.appendFileSync(logPathAbs, `\n\n# convert2xkt\n\n${tools.convert2xkt} -s ${inputFilePath} -o ${xktPathAbs} -l \n`);
        execSync(`node --max-old-space-size=24000 ${tools.convert2xkt} -s ${inputFilePath} -o ${xktPathAbs} -l >> ${logPathAbs}`, {stdio: 'inherit'});
        xktConvertedOK = true;
    } catch (e) {
        fs.appendFileSync(logPathAbs, `\n\n[Error]: ${e}\n`);
    }

    let endDate = new Date();
    let duration = endDate.getTime() - startDate.getTime();

    console.log(` - Finished pipeline '${pipelineName}' in ${duration} ms`);

    conversionSummary.pipelines[pipelineName] = {
        "xktConvertedOK": xktConvertedOK,
        "glbConvertedOK": glbConvertedOK,
        "jsonConvertedOK": jsonConvertedOK,
        "xktManifest": xktManifest
    };
}


(async () => {
    try {
        if (!allToolsAreInstalled()) {
            console.error("Not all tools are installed, exiting.");
            process.exit(1);
        }

        let startBatch = new Date();

        console.log("Start converting");

        await logSystemInfo();

        const inputBatchDirs = await fs.promises.readdir(inputFilesDir);

        for (const inputBatchDir of inputBatchDirs) { // BIMData, IfcOpenShell etc

            if (inputBatchDir.startsWith("_")) {
                continue;
            }
            const inputBatchDirPath = path.join(inputFilesDir, inputBatchDir);

            if (!fs.lstatSync(inputBatchDirPath).isDirectory()) {
                continue;
            }

            console.log("Converting batch: " + inputBatchDirPath);
            const outputBatchDirPath = path.join(resultsDir, inputBatchDir);
            if (fs.existsSync(outputBatchDirPath)) {
                fs.rmSync(outputBatchDirPath, {recursive: true, force: true});
            }
            fs.mkdirSync(outputBatchDirPath);

            addHtmlTableHeader(inputBatchDir);

            const inputFiles = await fs.promises.readdir(inputBatchDirPath);
            for (const inputFile of inputFiles) {  // foo.ifc, bar.ifc
                const ext = inputFile.split('.').pop();

                if (ext !== "ifc") {
                    continue;
                }

                ifcFilesCount++;

                console.log("Start converting file: " + inputFile);

                const startFile = new Date();

                const conversionSummary = {
                    pipelines: {}
                };

                try {
                    const inputFileName = path.parse(inputFile).name;
                    const inputFilePath = `${__dirname}/${path.join(inputBatchDirPath, inputFile)}`;
                    const modelResultsDirPath = `${outputBatchDirPath}/${inputFileName}/`;

                    if (fs.existsSync(modelResultsDirPath)) {
                        fs.rmSync(modelResultsDirPath, {recursive: true, force: true});
                    }

                    fs.mkdirSync(modelResultsDirPath);
                    fs.copyFileSync(inputFilePath, `${modelResultsDirPath}/model.ifc`);

                    //-------------------------------------------------------------------------------------------------------------------------------------

                    runCommunityPipeline(modelResultsDirPath, inputFile, inputFilePath, conversionSummary);

                    //-------------------------------------------------------------------------------------------------------------------------------------

                    runCxConverterPipeline(modelResultsDirPath, inputFile, inputFilePath, conversionSummary);

                    //-------------------------------------------------------------------------------------------------------------------------------------

                    //runMultiFormatPipeline(modelResultsDirPath, inputFile, inputFilePath, conversionSummary);

                    //-------------------------------------------------------------------------------------------------------------------------------------

                    conversionResultsHTML.push(`@@include('../_includes/modelConversionResults.html', { "batchId": "${inputBatchDir}", "modelId": "${inputFileName}" })`);

                    fs.writeFileSync(`${modelResultsDirPath}/summary.json`, JSON.stringify(conversionSummary));

                } catch (e) {
                    console.error("[Error]", e);
                }

                totalConversions++;

                const endFile = new Date();
                const fileDuration = endFile.getTime() - startFile.getTime();

                console.log(`Finished converting file: ${inputFile} in ${fileDuration} ms\n`);
            }

            addHtmlTableFooter();
        }

        console.log(`Finished processing ${ifcFilesCount} IFC files.`);

        fs.writeFileSync("./_includes/conversionResults.html", conversionResultsHTML.join("\n"), {encoding: 'utf8'});

        let endBatch = new Date();
        let overallDuration = endBatch.getTime() - startBatch.getTime();

        console.log(`Finished converting ${totalConversions} files in ${overallDuration} ms`);

    } catch (e) {
        console.error("[Error] ", e);
    }

})(); 