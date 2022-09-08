// Make an async function that gets executed immediately
const fs = require("fs");
const path = require("path");
const execSync = require('child_process').execSync;

const ifcDir = "./ifc";
const resultsDir = "./results";

const configsData = fs.readFileSync("./testdriveconfig.json");
const configs = JSON.parse(configsData);

(async () => {
    try {
        const date = new Date();
        const files = await fs.promises.readdir(ifcDir);

        const html = [];

        for (const file of files) {

            const fileName = path.parse(file).name;
            const ifcPath = path.join(ifcDir, file);
            const ifcPathAbs = `${__dirname}/${ifcPath}`;
            const resultsSubDir = `${resultsDir}/${fileName}`;

            if (fs.existsSync(resultsSubDir)) {
                fs.rmdirSync(resultsSubDir, {recursive: true, force: true});
            }
            fs.mkdirSync(resultsSubDir);

            fs.copyFileSync(ifcPathAbs, `${resultsSubDir}/model.ifc`);

            //

            const community1Dir = `${resultsSubDir}/community1`;
            const glbCommunity1Path = path.join(community1Dir, `model.glb`);
            const glbCommunity1PathAbs = `${__dirname}/${glbCommunity1Path}`;
            const jsonCommunity1Path = path.join(community1Dir, `model.json`);
            const jsonCommunity1PathAbs = `${__dirname}/${jsonCommunity1Path}`;
            const xktCommunity1Path = path.join(community1Dir, `model.xkt`);
            const xktCommunity1PathAbs = `${__dirname}/${xktCommunity1Path}`;
            const logCommunity1Path = path.join(community1Dir, `log.txt`);
            const logCommunity1PathAbs = `${__dirname}/${logCommunity1Path}`;

            const ll = `https://github.com/xeokit/xeokit-pipeline/blob/main/results/${fileName}/community1/log.txt`;

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

            fs.appendFileSync(logCommunity1PathAbs, `\n\n# IfcConvert\n\n${configs.paths["IfcConvert"]} ${ifcPathAbs} ${glbCommunity1PathAbs} --no-progress --generate-uvs --force-space-transparency 0.4 --door-arcs\n`);
            execSync(`${configs.paths["IfcConvert"]} ${ifcPathAbs} ${glbCommunity1PathAbs} --no-progress --generate-uvs --force-space-transparency 0.4 -v >> ${logCommunity1PathAbs}`, {stdio: 'inherit'});

            fs.appendFileSync(logCommunity1PathAbs, `\n\n# xeokit-metadata\n\n${configs.paths["xeokit-metadata"]} ${ifcPathAbs} ${jsonCommunity1PathAbs}\n`);
            execSync(`${configs.paths["xeokit-metadata"]} ${ifcPathAbs} ${jsonCommunity1PathAbs} >> ${logCommunity1PathAbs}`, {stdio: 'inherit'});

            fs.appendFileSync(logCommunity1PathAbs, `\n\n# convert2xkt\n\nnode ${configs.paths["convert2xkt"]} -s ${glbCommunity1PathAbs} -m ${jsonCommunity1PathAbs} -o ${xktCommunity1PathAbs} -l\n`);
            execSync(`node ${configs.paths["convert2xkt"]} -s ${glbCommunity1PathAbs} -m ${jsonCommunity1PathAbs} -o ${xktCommunity1PathAbs} -l >> ${logCommunity1PathAbs}`, {stdio: 'inherit'});

            const community2Dir = `${resultsSubDir}/community2`;
            const xktcommunity2Path = path.join(community2Dir, `model.xkt`);
            const xktcommunity2PathAbs = `${__dirname}/${xktcommunity2Path}`;
            const logCommunity2Path = path.join(community2Dir, `log.txt`);
            const logCommunity2PathAbs = `${__dirname}/${logCommunity2Path}`;

            fs.mkdirSync(community2Dir);

            fs.writeFileSync(logCommunity2PathAbs, `#----------------------------------------------------------------------------
# Community Pipeline 2 Log
#
# Converting file: ${file}
# Using tools: convert2xkt
# Date: ${date}
#----------------------------------------------------------------------------\n\n\n`, {encoding: 'utf8'});

            execSync(`node ${configs.paths["convert2xkt"]} -s ${ifcPathAbs} -o ${xktcommunity2PathAbs} -l >> ${logCommunity2PathAbs}`, {stdio: 'inherit'});

            //

            const enterprise1Dir = `${resultsSubDir}/enterprise1`;
            const glbEnterprise1Path = path.join(enterprise1Dir, `model.glb`);
            const glbEnterprise1PathAbs = `${__dirname}/${glbEnterprise1Path}`;
            const jsonEnterprise1Path = path.join(enterprise1Dir, `model.json`);
            const jsonEnterprise1PathAbs = `${__dirname}/${jsonEnterprise1Path}`;
            const xktEnterprise1Path = path.join(enterprise1Dir, `model.xkt`);
            const xktEnterprise1PathAbs = `${__dirname}/${xktEnterprise1Path}`;
            const logEnterprise1Path = path.join(enterprise1Dir, `log.txt`);
            const logEnterprise1PathAbs = `${__dirname}/${logEnterprise1Path}`;

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

            // Build report

            const communityPipeline1Docs = "#community-pipeline-1";
            const communityPipeline2Docs = "#community-pipeline-2";
            const enterprisePipeline1Docs = "#enterprise-pipeline-1";

            const reportCard = `@@include('../_includes/ifcFileReport.html', {
"modelId": "${fileName}",
"date": "${date}",
"title":"${file}",
"image": "./img/creoox/creoox_xeokit-thumb.png"
})`;

            html.push(reportCard);
//            
//             html.push(`\n### ${fileName}\n\n
// | View Model | IFC Conversion Pipeline | Conversion Log |
// | --- | --- | --- |
// | [.ifc](viewModel.html?src=results/${fileName}/model.ifc) | [WebIFCLoaderPlugin](https://xeokit.github.io/xeokit-sdk/docs/class/src/plugins/WebIFCLoaderPlugin/WebIFCLoaderPlugin.js~WebIFCLoaderPlugin.html) | NA |
// | [.glb](viewModel.html?src=results/${fileName}/community1/model.glb) | [Community Pipeline #1](${communityPipeline1Docs}) | [Log](results/${fileName}/community1/log.txt) |
// | [.glb](viewModel.html?src=results/${fileName}/enterprise1/model.glb) | [Enterprise Pipeline #1](${enterprisePipeline1Docs}) | [Log](results/${fileName}/enterprise1/log.txt) |
// | [.glb + .json](viewModel.html?src=results/${fileName}/community1/model.glb&metaModelSrc=results/${fileName}/community1/model.json) | [Community Pipeline #1](${communityPipeline1Docs})  | [Log](results/${fileName}/community1/log.txt) |
// | [.glb + .json](viewModel.html?src=results/${fileName}/enterprise1/model.glb&metaModelSrc=results/${fileName}/enterprise1/model.json) | [Enterprise Pipeline #1](${enterprisePipeline1Docs})  | [Log](results/${fileName}/enterprise1/log.txt) |
// | [.xkt](viewModel.html?src=results/${fileName}/community1/model.xkt) | [Community Pipeline #1](${communityPipeline1Docs}) | [Log](results/${fileName}/community1/log.txt) |
// | [.xkt](viewModel.html?src=results/${fileName}/community2/model.xkt) | [Community Pipeline #2](${communityPipeline2Docs}) | [Log](results/${fileName}/community2/log.txt) |
// | [.xkt](viewModel.html?src=results/${fileName}/enterprise1/model.xkt)| [Enterprise Pipeline #1](${enterprisePipeline1Docs}) | [Log](results/${fileName}/enterprise1/log.txt) |\n`);
        }

        fs.writeFileSync("./_includes/ifcFileReports.html", html.join("\n"), {encoding: 'utf8'});


    } catch (e) {
        console.error("We've thrown! Whoops!", e);
    }

})(); 