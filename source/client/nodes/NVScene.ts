/**
 * 3D Foundation Project
 * Copyright 2018 Smithsonian Institution
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { IDocument, IScene } from "common/types/document";

import NVNode, { INodeComponents } from "./NVNode";

import CVScene from "../components/CVScene";
import CVSetup from "../components/CVSetup";
import CVInfo from "../components/CVInfo";
import Component from "@ff/graph/Component";

////////////////////////////////////////////////////////////////////////////////

export default class NVScene extends NVNode
{
    static readonly typeName: string = "NVScene";

    get setup() {
        return this.components.get(CVSetup, true);
    }

    createComponents()
    {
        this.createComponent(CVScene);
        this.createComponent(CVSetup);
        this.createComponent(CVInfo);
    }

    fromDocument(document: IDocument, sceneIndex: number, pathMap: Map<string, Component>)
    {
        const scene = document.scenes[sceneIndex];

        if (scene.name) {
            this.name = scene.name;
        }

        this.scene.fromDocument(document, scene);

        // serialize node tree
        const nodeIndices = scene.nodes;
        if (nodeIndices) {
            nodeIndices.forEach(nodeIndex => {
                const childNode = this.graph.createCustomNode(NVNode);
                this.transform.addChild(childNode.transform);
                childNode.fromDocument(document, nodeIndex, pathMap);
            });
        }

        // serialize additional scene components
        if (isFinite(scene.info)) {
            this.info.fromDocument(document, scene);
            pathMap.set(`info/${scene.info}`, this.info);
        }
        if (isFinite(scene.setup)) {
            this.setup.fromDocument(document, sceneIndex, pathMap);
        }
    }

    toDocument(document: IDocument, pathMap: Map<Component, string>, components?: INodeComponents): number
    {
        document.scenes = document.scenes || [];
        const sceneIndex = document.scenes.length;
        const scene: IScene = { units: "cm" };
        document.scenes.push(scene);

        this.scene.toDocument(document, scene);

        // serialize node tree
        const children = this.transform.children
            .map(child => child.node).filter(node => node.is(NVNode)) as NVNode[];

        children.forEach(child => {
            if (child.hasNodeComponents(components)) {
                const index = child.toDocument(document, pathMap, components);
                scene.nodes = scene.nodes || [];
                scene.nodes.push(index);
            }
        });

        // serialize additional scene components
        if (!components || components.scene) {
            if (this.info) {
                scene.info = this.info.toDocument(document, scene);
                pathMap.set(this.info, `info/${scene.info}`);
            }

            if (this.setup) {
                this.setup.toDocument(document, sceneIndex, pathMap);
            }
        }

        return sceneIndex;
    }
}