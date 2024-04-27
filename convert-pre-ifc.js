const fs = require("fs");
const path = require("path");
const configsData = fs.readFileSync("./convertconfig.json");
const configs = JSON.parse(configsData);
const inputFilesDir = "./inputFiles/ifc/";
const convertedModelsDir = "./convertedModels/ifc/";
const convertedProjectsDir = "./convertedModels/ifc/projects/";
const errors = {};
const bashScript = [];

(async () => {
    try {
        if (!fs.existsSync(convertedProjectsDir)) {
            fs.mkdirSync(convertedProjectsDir);
        }
        const inputBatchDirs = await fs.promises.readdir(inputFilesDir);
        for (const inputBatchDir of inputBatchDirs) { // BIMData, IfcOpenShell etc
            if (inputBatchDir.startsWith("_")) {
                continue;
            }
            const inputBatchDirPath = path.join(inputFilesDir, inputBatchDir);
            const isDir = fs.lstatSync(inputBatchDirPath).isDirectory();
            if (isDir) {
                const outputBatchDirPath = path.join(convertedProjectsDir, inputBatchDir);
                if (fs.existsSync(outputBatchDirPath)) {
                    fs.rmSync(outputBatchDirPath, {recursive: true, force: true});
                }
                fs.mkdirSync(outputBatchDirPath);
                const inputFiles = await fs.promises.readdir(inputBatchDirPath);
                const convertedModelSetDir = `${outputBatchDirPath}/models/`;
                if (fs.existsSync(convertedModelSetDir)) {
                    fs.rmSync(convertedModelSetDir, {recursive: true, force: true});
                }
                fs.mkdirSync(convertedModelSetDir);
                for (const inputFile of inputFiles) {  // foo.ifc, bar.ifc
                    const ext = inputFile.split('.').pop();
                    if (ext !== "ifc") {
                        console.log(`Skipping file (".ifc" extension expected): ${inputFile}`);
                        continue;
                    }
                    const inputFileName = path.parse(inputFile).name;
                    const ifcInputPath = `${__dirname}/${path.join(inputBatchDirPath, inputFile)}`;
                    const convertedModelDir = `${outputBatchDirPath}/models/${inputFileName}/`;
                    const modelOutPath = convertedModelDir;
                    const glbOutputPath = path.join(modelOutPath, `model.glb`);
                    const jsonOutputPath = path.join(modelOutPath, `model.json`);
                    const logPath = path.join(modelOutPath, `log.txt`);
                    const jsonManifestPath = path.join(modelOutPath, `model.manifest.json`);
                    const xktManifestPath = path.join(modelOutPath, `model.xkt.manifest.json`);
                    if (fs.existsSync(convertedModelDir)) {
                        fs.rmSync(convertedModelDir, {recursive: true, force: true});
                    }
                    fs.mkdirSync(convertedModelDir);
                    if (fs.existsSync(modelOutPath)) {
                        fs.rmSync(modelOutPath, {recursive: true, force: true});
                    }
                    fs.mkdirSync(modelOutPath);
                    try {
                        const ifc2gltfCmd = `${configs.ifc2gltf.path}` +
                            ` -c ${configs.ifc2gltf.options.c}` +
                            ` -i ${ifcInputPath}` +
                            ` -o ${glbOutputPath}` +
                            ` -m ${jsonOutputPath}` +
                            ` -s ${configs.ifc2gltf.options.s}` +
                            ` -t ${configs.ifc2gltf.options.t}` +
                            ` -e 3 >> ${logPath}`;
                        fs.appendFileSync(logPath, ifc2gltfCmd + "\n");
                        bashScript.push(`echo "ifc2gltf: ${inputFileName}"`);
                        bashScript.push(`echo "${ifc2gltfCmd}" >> ${logPath}`);
                        bashScript.push(ifc2gltfCmd);
                        const convert2xktCmd = `node --max-old-space-size=14000` +
                            ` ${configs.convert2xkt.path}/convert2xkt.js -t ` +
                            ` -c ${configs.convert2xkt.path}/convert2xkt.conf.json ` +
                            ` -a ${jsonManifestPath} ` +
                            ` -o ${xktManifestPath} ` +
                            ` -l >> ${logPath}`;
                        console.log("convert2xkt: " + convert2xktCmd);
                        fs.appendFileSync(logPath, convert2xktCmd + "\n\n");
                        bashScript.push(`echo "convert2xkt: ${inputFileName}"`);
                        bashScript.push(`echo "${convert2xktCmd}">> ${logPath}`);
                        bashScript.push(convert2xktCmd);
                    } catch (e) {
                        console.log(e)
                        errors[ifcInputPath] = e;
                        continue;
                    }
                }
            }
        }
        fs.writeFileSync("./convert-ifc.sh", bashScript.join("\n"), {encoding: 'utf8'});
    } catch (e) {
        console.error("[Error] ", e);
    }

})();