const fs = require("fs");
const path = require("path");
const execSync = require('child_process').execSync;
const si = require('systeminformation');

const inputFilesDir = "./inputFiles/";
const resultsDir = "./results/";

const configsData = fs.readFileSync("./convertconfig.json");
const configs = JSON.parse(configsData);

(async () => {
    try {

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

        const resultsInfo = {
            conversions: []
        }

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


        const conversionResultsHTML = [];

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
                    fs.rmdirSync(outputBatchDirPath, {recursive: true, force: true});
                }
                fs.mkdirSync(outputBatchDirPath);

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
                const inputFiles = await fs.promises.readdir(inputBatchDirPath);
                for (const inputFile of inputFiles) {  // foo.ifc, bar.ifc
                    const ext = inputFile.split('.').pop();

                    if (ext !== "ifc") {
                        continue;
                    }

                    console.log("Converting file: " + inputFile);

                    try {

                        const inputFileName = path.parse(inputFile).name;
                        const inputFilePath = `${__dirname}/${path.join(inputBatchDirPath, inputFile)}`;
                        const modelResultsDirPath = `${outputBatchDirPath}/${inputFileName}/`;

                        if (fs.existsSync(modelResultsDirPath)) {
                            fs.rmdirSync(modelResultsDirPath, {recursive: true, force: true});
                        }

                        fs.mkdirSync(modelResultsDirPath);
                        fs.copyFileSync(inputFilePath, `${modelResultsDirPath}/model.ifc`);

                        const c1dir = `${modelResultsDirPath}/ifcCommunityPipeline1`;
                        const glbCommunity1Path = path.join(c1dir, `model.glb`);
                        const glbCommunity1PathAbs = `${__dirname}/${glbCommunity1Path}`;
                        const jsonCommunity1Path = path.join(c1dir, `model.json`);
                        const jsonCommunity1PathAbs = `${__dirname}/${jsonCommunity1Path}`;
                        const xktCommunity1Path = path.join(c1dir, `model.xkt`);
                        const xktCommunity1PathAbs = `${__dirname}/${xktCommunity1Path}`;
                        const logCommunity1Path = path.join(c1dir, `log.txt`);
                        const logCommunity1PathAbs = `${__dirname}/${logCommunity1Path}`;

                        fs.mkdirSync(c1dir);
                        fs.writeFileSync(logCommunity1PathAbs, `#----------------------------------------------------------------------------
# Community IFC Conversion Pipeline Log
#
# ${date}
#
# Converting file: ${inputFile}
# Using tools: IfcConvert, xeokit-metadata and convert2xkt
# More info: 
#----------------------------------------------------------------------------\n`, {encoding: 'utf8'});

                        fs.appendFileSync(logCommunity1PathAbs, `\n\n# IfcConvert\n\n${configs.paths["IfcConvert"]} ${inputFilePath} ${glbCommunity1PathAbs} --use-element-guids --no-progress  --force-space-transparency 0.4\n`);
                        execSync(`${configs.paths["IfcConvert"]} ${inputFilePath} ${glbCommunity1PathAbs} --use-element-guids --no-progress --force-space-transparency 0.4 -v >> ${logCommunity1PathAbs}`, {stdio: 'inherit'});

                        fs.appendFileSync(logCommunity1PathAbs, `\n\n# xeokit-metadata\n\n${configs.paths["xeokit-metadata"]} ${inputFilePath} ${jsonCommunity1PathAbs}\n`);
                        execSync(`${configs.paths["xeokit-metadata"]} ${inputFilePath} ${jsonCommunity1PathAbs} >> ${logCommunity1PathAbs}`, {stdio: 'inherit'});

                        fs.appendFileSync(logCommunity1PathAbs, `\n\n# convert2xkt\n\nnode ${configs.paths["convert2xkt"]} -s ${glbCommunity1PathAbs} -m ${jsonCommunity1PathAbs} -o ${xktCommunity1PathAbs} -l\n`);
                        execSync(`node ${configs.paths["convert2xkt"]} -s ${glbCommunity1PathAbs} -m ${jsonCommunity1PathAbs} -o ${xktCommunity1PathAbs} -l >> ${logCommunity1PathAbs}`, {stdio: 'inherit'});


                        const enterprise1DirPath = `${modelResultsDirPath}/ifcCXConverterPipeline1`;
                        const glbEnterprise1Path = path.join(enterprise1DirPath, `model.glb`);
                        const glbEnterprise1PathAbs = `${__dirname}/${glbEnterprise1Path}`;
                        const jsonEnterprise1Path = path.join(enterprise1DirPath, `model.json`);
                        const jsonEnterprise1PathAbs = `${__dirname}/${jsonEnterprise1Path}`;
                        const xktEnterprise1Path = path.join(enterprise1DirPath, `model.xkt`);
                        const xktEnterprise1PathAbs = `${__dirname}/${xktEnterprise1Path}`;
                        const logEnterprise1Path = path.join(enterprise1DirPath, `log.txt`);
                        const logEnterprise1PathAbs = `${__dirname}/${logEnterprise1Path}`;

                        fs.mkdirSync(enterprise1DirPath);
                        fs.writeFileSync(logEnterprise1PathAbs, `#----------------------------------------------------------------------------
# CxConverter IFC Conversion Pipeline Log
#
# Converting file: ${inputFile}
# Using tools: ifc2gltf and convert2xkt
# Date: ${date}
#----------------------------------------------------------------------------\n\n`, {encoding: 'utf8'});
                        fs.appendFileSync(logEnterprise1PathAbs, `\n\n# ifc2gltf\n\n${configs.paths["ifc2gltf"]} -i ${inputFilePath} -o ${glbEnterprise1PathAbs} -m ${jsonEnterprise1PathAbs}\n`);
                        execSync(`${configs.paths["ifc2gltf"]} -i ${inputFilePath} -o ${glbEnterprise1PathAbs} -m ${jsonEnterprise1PathAbs} >> ${logEnterprise1PathAbs}`, {stdio: 'inherit'});

                        fs.appendFileSync(logEnterprise1PathAbs, `\n\n# convert2xkt\n\n${configs.paths["convert2xkt"]} -s ${glbEnterprise1PathAbs} -m ${jsonEnterprise1PathAbs} -o ${xktEnterprise1PathAbs} -l \n`);
                        execSync(`node ${configs.paths["convert2xkt"]} -s ${glbEnterprise1PathAbs} -m ${jsonEnterprise1PathAbs} -o ${xktEnterprise1PathAbs} -l >> ${logEnterprise1PathAbs}`, {stdio: 'inherit'});

                        conversionResultsHTML.push(`@@include('../_includes/modelConversionResults.html', { "batchId": "${inputBatchDir}", "modelId": "${inputFileName}" })`);

                    } catch (e) {
                        console.error("[Error] ", e);
                    }
                }

                conversionResultsHTML.push(`</tbody>
                </table>
            </div>
        </div>
    </div>
</section>`);
            }
        }

        fs.writeFileSync("./_includes/conversionResults.html", conversionResultsHTML.join("\n"), {encoding: 'utf8'});

    } catch (e) {
        console.error("[Error] ", e);
    }

})(); 