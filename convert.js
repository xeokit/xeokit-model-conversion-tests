// Make an async function that gets executed immediately
const fs = require("fs");
const path = require("path");
const execSync = require('child_process').execSync;
const si = require('systeminformation');

const inputFilesDir = "./inputFiles";
const resultsDir = "./results";

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


        const files = await fs.promises.readdir(inputFilesDir);

        const conversionResultsHTML = [];
        
        let conversionInfo;

        for (const file of files) {

            const fileName = path.parse(file).name;
          //  const baseName = path.basename(file);
            const baseName = fileName;
            const ifcPath = path.join(inputFilesDir, file);
            const ifcPathAbs = `${__dirname}/${ifcPath}`;
            const resultsSubDir = `${resultsDir}/${fileName}`;

            if (fs.existsSync(resultsSubDir)) {
                fs.rmdirSync(resultsSubDir, {recursive: true, force: true});
            }

            fs.mkdirSync(resultsSubDir);

            fs.copyFileSync(ifcPathAbs, `${resultsSubDir}/model.ifc`);

            const community1Dir = `${resultsSubDir}/ifcCommunityPipeline1`;
            const glbCommunity1Path = path.join(community1Dir, `model.glb`);
            const glbCommunity1PathAbs = `${__dirname}/${glbCommunity1Path}`;
            const jsonCommunity1Path = path.join(community1Dir, `model.json`);
            const jsonCommunity1PathAbs = `${__dirname}/${jsonCommunity1Path}`;
            const xktCommunity1Path = path.join(community1Dir, `model.xkt`);
            const xktCommunity1PathAbs = `${__dirname}/${xktCommunity1Path}`;
            const logCommunity1Path = path.join(community1Dir, `log.txt`);
            const logCommunity1PathAbs = `${__dirname}/${logCommunity1Path}`;

            conversionInfo = {
                conversionId: resultsInfo.conversions.length,
                modelId: fileName,
                modelSrc: baseName,
                pipelineId: "ifcCommunityPipeline1",
                pipelineName: "IFC Community Pipeline #1",
                viewableArtifacts: [["glb", "json"], "glb", "ifc", "xkt"],
                date: date
            };
            
            resultsInfo.conversions.push(conversionInfo);

            fs.mkdirSync(community1Dir);
            fs.writeFileSync(logCommunity1PathAbs, `#----------------------------------------------------------------------------
# Community Pipeline 1 Log
#
# ${date}
#
# Converting file: ${file}
# Using tools: IfcConvert, xeokit-metadata and convert2xkt
# More info: 
#----------------------------------------------------------------------------\n`, {encoding: 'utf8'});

            fs.appendFileSync(logCommunity1PathAbs, `\n\n# IfcConvert\n\n${configs.paths["IfcConvert"]} ${ifcPathAbs} ${glbCommunity1PathAbs} --use-element-guids --no-progress  --force-space-transparency 0.4 --door-arcs\n`);
            execSync(`${configs.paths["IfcConvert"]} ${ifcPathAbs} ${glbCommunity1PathAbs} --no-progress --force-space-transparency 0.4 -v >> ${logCommunity1PathAbs}`, {stdio: 'inherit'});

            fs.appendFileSync(logCommunity1PathAbs, `\n\n# xeokit-metadata\n\n${configs.paths["xeokit-metadata"]} ${ifcPathAbs} ${jsonCommunity1PathAbs}\n`);
            execSync(`${configs.paths["xeokit-metadata"]} ${ifcPathAbs} ${jsonCommunity1PathAbs} >> ${logCommunity1PathAbs}`, {stdio: 'inherit'});

            fs.appendFileSync(logCommunity1PathAbs, `\n\n# convert2xkt\n\nnode ${configs.paths["convert2xkt"]} -s ${glbCommunity1PathAbs} -m ${jsonCommunity1PathAbs} -o ${xktCommunity1PathAbs} -l\n`);
            execSync(`node ${configs.paths["convert2xkt"]} -s ${glbCommunity1PathAbs} -m ${jsonCommunity1PathAbs} -o ${xktCommunity1PathAbs} -l >> ${logCommunity1PathAbs}`, {stdio: 'inherit'});

            const community2Dir = `${resultsSubDir}/ifcCommunityPipeline2`;
            const xktcommunity2Path = path.join(community2Dir, `model.xkt`);
            const xktcommunity2PathAbs = `${__dirname}/${xktcommunity2Path}`;
            const logCommunity2Path = path.join(community2Dir, `log.txt`);
            const logCommunity2PathAbs = `${__dirname}/${logCommunity2Path}`;

            conversionInfo = {
                conversionId: resultsInfo.conversions.length,
                modelId: fileName,
                modelSrc: baseName,
                pipelineId: "ifcCommunityPipeline2",
                pipelineName: "IFC Community Pipeline #2",
                viewableArtifacts: [["glb", "json"], "glb", "ifc", "xkt"],
                date: date
            };

            resultsInfo.conversions.push(conversionInfo);

            fs.mkdirSync(community2Dir);

            fs.writeFileSync(logCommunity2PathAbs, `#----------------------------------------------------------------------------
# Community Pipeline 2 Log
#
# Converting file: ${file}
# Using tools: convert2xkt
# Date: ${date}
#----------------------------------------------------------------------------\n\n\n`, {encoding: 'utf8'});

            execSync(`node ${configs.paths["convert2xkt"]} -s ${ifcPathAbs} -o ${xktcommunity2PathAbs} -l >> ${logCommunity2PathAbs}`, {stdio: 'inherit'});

            const enterprise1Dir = `${resultsSubDir}/ifcEnterprisePipeline1`;
            const glbEnterprise1Path = path.join(enterprise1Dir, `model.glb`);
            const glbEnterprise1PathAbs = `${__dirname}/${glbEnterprise1Path}`;
            const jsonEnterprise1Path = path.join(enterprise1Dir, `model.json`);
            const jsonEnterprise1PathAbs = `${__dirname}/${jsonEnterprise1Path}`;
            const xktEnterprise1Path = path.join(enterprise1Dir, `model.xkt`);
            const xktEnterprise1PathAbs = `${__dirname}/${xktEnterprise1Path}`;
            const logEnterprise1Path = path.join(enterprise1Dir, `log.txt`);
            const logEnterprise1PathAbs = `${__dirname}/${logEnterprise1Path}`;

            conversionInfo = {
                conversionId: resultsInfo.conversions.length,
                modelId: fileName,
                modelSrc: baseName,
                pipelineId: "ifcEnterprisePipeline1",
                pipelineName: "IFC Enterprise Pipeline #1",
                viewableArtifacts: [["glb", "json"], "glb", "ifc", "xkt"],
                date: date
            };
            
            resultsInfo.conversions.push(conversionInfo);

            fs.mkdirSync(enterprise1Dir);

            fs.writeFileSync(logEnterprise1PathAbs, `#----------------------------------------------------------------------------
# Enterprise Pipeline 1 Log
#
# Converting file: ${file}
# Using tools: ifc2gltf and convert2xkt
# Date: ${date}
#----------------------------------------------------------------------------\n\n`, {encoding: 'utf8'});

            fs.appendFileSync(logEnterprise1PathAbs, `\n\n# ifc2gltf\n\n${configs.paths["ifc2gltf"]} -i ${ifcPathAbs} -o ${glbEnterprise1PathAbs} -m ${jsonEnterprise1PathAbs}\n`);
            execSync(`${configs.paths["ifc2gltf"]} -i ${ifcPathAbs} -o ${glbEnterprise1PathAbs} -m ${jsonEnterprise1PathAbs} >> ${logEnterprise1PathAbs}`, {stdio: 'inherit'});
            fs.appendFileSync(logEnterprise1PathAbs, `\n\n# convert2xkt\n\n${configs.paths["convert2xkt"]} -s ${glbEnterprise1PathAbs} -m ${jsonEnterprise1PathAbs} -o ${xktEnterprise1PathAbs} -l \n`);
            execSync(`node ${configs.paths["convert2xkt"]} -s ${glbEnterprise1PathAbs} -m ${jsonEnterprise1PathAbs} -o ${xktEnterprise1PathAbs} -l >> ${logEnterprise1PathAbs}`, {stdio: 'inherit'});
            
            conversionResultsHTML.push(`@@include('../_includes/modelConversionResults.html', { "modelId": "${fileName}", "title":"${baseName}", "conversionId": "${conversionInfo.conversionId}" })`);
        }

        fs.writeFileSync("./results/resultsInfo.json", JSON.stringify(resultsInfo, null, "\t"), {encoding: 'utf8'});
        fs.writeFileSync("./_includes/conversionResults.html", conversionResultsHTML.join("\n"), {encoding: 'utf8'});

    } catch (e) {
        console.error("We've thrown! Whoops!", e);
    }

})(); 