// kdTree.js

const math = {
    MIN_TILE_SIZE: 20,
    MIN_DOUBLE: -Number.MAX_SAFE_INTEGER,
    MAX_DOUBLE: Number.MAX_SAFE_INTEGER,

    AABB3() {
        return [this.MAX_DOUBLE, this.MAX_DOUBLE, this.MAX_DOUBLE, this.MIN_DOUBLE, this.MIN_DOUBLE, this.MIN_DOUBLE];
    },

    collapseAABB3(aabb = this.AABB3()) {
        aabb[0] = this.MAX_DOUBLE;
        aabb[1] = this.MAX_DOUBLE;
        aabb[2] = this.MAX_DOUBLE;
        aabb[3] = -this.MAX_DOUBLE;
        aabb[4] = -this.MAX_DOUBLE;
        aabb[5] = -this.MAX_DOUBLE;
        return aabb;
    },

    expandAABB3(aabb1, aabb2) {
        if (aabb1[0] > aabb2[0]) aabb1[0] = aabb2[0];
        if (aabb1[1] > aabb2[1]) aabb1[1] = aabb2[1];
        if (aabb1[2] > aabb2[2]) aabb1[2] = aabb2[2];
        if (aabb1[3] < aabb2[3]) aabb1[3] = aabb2[3];
        if (aabb1[4] < aabb2[4]) aabb1[4] = aabb2[4];
        if (aabb1[5] < aabb2[5]) aabb1[5] = aabb2[5];
        return aabb1;
    },

    getAABB3Diag(aabb) {
        const dx = aabb[3] - aabb[0];
        const dy = aabb[4] - aabb[1];
        const dz = aabb[5] - aabb[2];
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    },

    containsAABB3(container, contained) {
        return (
            container[0] <= contained[0] &&
            container[1] <= contained[1] &&
            container[2] <= contained[2] &&
            container[3] >= contained[3] &&
            container[4] >= contained[4] &&
            container[5] >= contained[5]
        );
    },
};

class KDTree {
    constructor(cfg = {}) {
        this._models = [];
        this._rootNode = null;
    }

    addModel(glbManifest, batchId, modelId) {
        const min = glbManifest.modelBoundsMin;
        const max = glbManifest.modelBoundsMax;
        this._models.push({
            aabb: [min[0], min[1], min[2], max[0], max[1], max[2]],
            batchId,
            modelId,
        });
        this._rootNode = null;
    }

    get root() {
        if (!this._rootNode) {
            this._createKDTree();
        }
        return this._rootNode;
    }

    _createKDTree() {
        let aabb = math.collapseAABB3();
        for (let i = 0, len = this._models.length; i < len; i++) {
            const model = this._models[i];
            math.expandAABB3(aabb, model.aabb);
        }
        this._rootNode = {
            aabb,
        };
        for (let i = 0, len = this._models.length; i < len; i++) {
            const model = this._models[i];
            this._insertModelIntoKDTree(this._rootNode, model);
        }
    }

    _insertModelIntoKDTree(kdNode, model) {
        console.log("insert");
        const nodeAABB = kdNode.aabb;
        const modelAABB = model.aabb;
        const nodeAABBDiag = math.getAABB3Diag(nodeAABB);
        if (nodeAABBDiag < math.MIN_TILE_SIZE) {
            kdNode.models = kdNode.models || [];
            kdNode.models.push(model);
            math.expandAABB3(nodeAABB, modelAABB);
            return;
        }
        if (kdNode.left) {
            if (math.containsAABB3(kdNode.left.aabb, modelAABB)) {
                this._insertModelIntoKDTree(kdNode.left, model);
                return;
            }
        }
        if (kdNode.right) {
            if (math.containsAABB3(kdNode.right.aabb, modelAABB)) {
                this._insertModelIntoKDTree(kdNode.right, model);
                return;
            }
        }
        const kdTreeDimLength = new Float32Array(3);
        kdTreeDimLength[0] = nodeAABB[3] - nodeAABB[0];
        kdTreeDimLength[1] = nodeAABB[4] - nodeAABB[1];
        kdTreeDimLength[2] = nodeAABB[5] - nodeAABB[2];
        let dim = 0;
        if (kdTreeDimLength[1] > kdTreeDimLength[dim]) {
            dim = 1;
        }
        if (kdTreeDimLength[2] > kdTreeDimLength[dim]) {
            dim = 2;
        }
        if (!kdNode.left) {
            const aabbLeft = nodeAABB.slice();
            aabbLeft[dim + 3] = (nodeAABB[dim] + nodeAABB[dim + 3]) / 2.0;
            kdNode.left = {
                aabb: aabbLeft,
            };
            if (math.containsAABB3(aabbLeft, modelAABB)) {
                this._insertModelIntoKDTree(kdNode.left, model);
                return;
            }
        }
        if (!kdNode.right) {
            const aabbRight = nodeAABB.slice();
            aabbRight[dim] = (nodeAABB[dim] + nodeAABB[dim + 3]) / 2.0;
            kdNode.right = {
                aabb: aabbRight,
            };
            if (math.containsAABB3(aabbRight, modelAABB)) {
                this._insertModelIntoKDTree(kdNode.right, model);
                return;
            }
        }
        kdNode.models = kdNode.models || [];
        kdNode.models.push(model);
        math.expandAABB3(nodeAABB, modelAABB);
    }
}

module.exports = { KDTree, math };
