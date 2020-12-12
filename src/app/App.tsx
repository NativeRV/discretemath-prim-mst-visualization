import React, { useEffect, useRef } from 'react';
import { uniqBy } from 'lodash';
import './App.scss';
import '../lib/styles/classes.scss';
import { mstPrim } from '../feature/prims-algorithm/mst-prim';
import ForceGraph3D from 'react-force-graph-3d';
import type { ForceGraphMethods } from 'react-force-graph-3d';
import ForceGraph2D, { ForceGraphProps } from 'react-force-graph-2d';

import { Event } from 'effector-logger';
import { useStore } from 'effector-react';
import {
  $colors,
  $mode,
  $graph,
  $gvDividers,
  $gvName,
  $gvSize,
  toggleTheme,
  toggleMode,
  setSize,
  loadGraphFromGV,
  loadAdjacencyMatrixFromFile,
  loadWeightMatrixFromFile,
  setName,
  setDividers,
  fxLoadAdjacencyMatrixFromFile,
  fxLoadWeightMatrixFromFile,
  $adjacencyMatrix,
  setHilightedSubGraph,
  $hilightedSubGraph,
  $weightMatrix,
  toggleAdjacencyMatrixModal,
  toggleWeightMatrixModal,
  toggleActions,
  $isActionsMinimised,
  $isAdjacencyMatrixModalOpened,
  $isWeightMatrixModalOpened,
} from '../model';
import { makeCreateSphere } from '../feature/graph-visualization/createSphere';
import { makeCreateLink3D } from '../feature/graph-visualization/createLink3D';
import { makeCreateLink2D } from '../feature/graph-visualization/createLink2D';
import { link3DPositionUpdateFn } from '../feature/graph-visualization/link3DPositionUpdateFn';
import { makeCreateCircle } from '../feature/graph-visualization/createCircle';
import { mstPrimGen } from '../feature/prims-algorithm/mst-prim-generator';
import { wait } from '../lib/wait';
import { Modal } from '../lib/components/modal/Modal';
import { Overlay } from '../lib/components/overlay/Overlay';

const DISTANCE = 500;

export function App() {
  const colors = useStore($colors);
  const mode = useStore($mode);
  const graph = useStore($graph);
  const adjacencyMatrix = useStore($adjacencyMatrix);
  const weightMatrix = useStore($weightMatrix);

  const name = useStore($gvName);
  const size = useStore($gvSize);
  const dividers = useStore($gvDividers);

  const highlightedSubGraph = useStore($hilightedSubGraph);

  const isActionsMinimised = useStore($isActionsMinimised);
  const isAdjacencyMatrixModalOpened = useStore($isAdjacencyMatrixModalOpened);
  const isWeightMatrixModalOpened = useStore($isWeightMatrixModalOpened);

  const graph3DRef = useRef<ForceGraphMethods>();
  const graph2DRef = useRef<ForceGraphMethods>();

  // Установка силы отторжения между вершинами
  useEffect(() => {
    // @ts-ignore
    graph3DRef.current?.d3Force('charge').strength(-DISTANCE);

    // @ts-ignore
    graph2DRef.current?.d3Force('link').distance(DISTANCE);
    // @ts-ignore
    graph2DRef.current?.d3Force('charge').strength(-DISTANCE);
  });

  function makeHandleChange(setter: Event<string>) {
    return function (e: React.ChangeEvent<HTMLInputElement>) {
      setter(e.currentTarget.value);
    };
  }

  const params: ForceGraphProps = {
    graphData: graph,
    backgroundColor: colors.background,
    nodeColor: () => colors.primary,
    linkColor: ({ source, target }) =>
      highlightedSubGraph.links.find((subGraphLink) => {
        return (
          // @ts-ignore
          subGraphLink.source === source.id && subGraphLink.target === target.id
        );
      })
        ? colors.accent
        : colors.secondary,

    linkWidth: ({ source, target }) =>
      highlightedSubGraph.links.find((subGraphLink) => {
        return (
          // @ts-ignore
          subGraphLink.source === source.id && subGraphLink.target === target.id
        );
      })
        ? 6
        : 2,
  };

  async function handleCalculatePrimAnimClick(
    e: React.MouseEvent<HTMLButtonElement>
  ) {
    // Генераторная версия алгоритма, возвращающая значения по шагам
    const mstGen = mstPrimGen(adjacencyMatrix, weightMatrix);

    for (const partialMST of mstGen) {
      const links = partialMST.map(([source, target]) => ({ source, target }));

      // Маппим пары вершин (рёбра) в уникальные вершины задействованные в этих рёбрах
      const nodes = uniqBy(
        partialMST.flatMap(([source, target]) => [
          { id: source },
          { id: target },
        ]),
        'id'
      );

      setHilightedSubGraph({ nodes, links });
      await wait(0.5);
    }
  }

  function handleCalculatePrimClick(e: React.MouseEvent<HTMLButtonElement>) {
    const mst = mstPrim(adjacencyMatrix);

    const links = mst.map(([source, target]) => ({ source, target }));
    const nodes = adjacencyMatrix.map((row, i) => ({ id: i + 1 }));

    setHilightedSubGraph({ nodes, links });
  }

  function handleZoomToFitClick() {
    graph3DRef.current?.zoomToFit(400);
    graph2DRef.current?.zoomToFit(400);
  }

  const customRenderObjectParams = { colors, highlightedSubGraph };

  return (
    <div className="App">
      <Modal
        visible={isAdjacencyMatrixModalOpened}
        onClose={toggleAdjacencyMatrixModal}
      >
        <p>Adj modal</p>
      </Modal>
      <Modal
        visible={isWeightMatrixModalOpened}
        onClose={toggleWeightMatrixModal}
      >
        <p>Weight modal</p>
      </Modal>

      <Overlay minimized={isActionsMinimised} onToggle={toggleActions}>
        <button onClick={toggleTheme}>Theme</button>
        <button onClick={toggleMode}>Mode</button>

        <br />
        <br />

        <label htmlFor="adjacencyMatrixFile">Adjacency matrix: </label>
        <input type="file" onChange={fxLoadAdjacencyMatrixFromFile} />
        <br />
        <label htmlFor="weightMatrixFile">Weight matrix: </label>
        <input type="file" onChange={fxLoadWeightMatrixFromFile} />
        <br />

        <button onClick={loadAdjacencyMatrixFromFile}>
          Load Adj From File
        </button>
        <button onClick={loadWeightMatrixFromFile}>
          Load Weights From File
        </button>

        <br />
        <br />

        <label htmlFor="name">Имя: </label>
        <input
          type="text"
          name="name"
          value={name}
          onChange={makeHandleChange(setName)}
        />
        <br />
        <label htmlFor="size">Размер: </label>
        <input
          type="text"
          name="size"
          value={size}
          onChange={makeHandleChange(setSize)}
        />
        <br />
        <label htmlFor="dividers">Делители: </label>
        <input
          type="text"
          name="dividers"
          value={dividers}
          onChange={makeHandleChange(setDividers)}
        />
        <br />
        <button onClick={loadGraphFromGV}>Load From GV</button>
        <br />
        <br />
        <button onClick={handleCalculatePrimClick}>Calculate Prim's MST</button>
        <button onClick={handleCalculatePrimAnimClick}>
          Animate Prim's MST
        </button>
        <br />
        <button onClick={handleZoomToFitClick}>Zoom to fit</button>
        <br />
        <br />
        <button onClick={toggleAdjacencyMatrixModal}>
          Edit adjacency matrix
        </button>
        <br />
        <button onClick={toggleWeightMatrixModal}>Edit weight matrix</button>
      </Overlay>

      {mode === '3D' ? (
        <ForceGraph3D
          {...params}
          ref={graph3DRef}
          nodeThreeObject={makeCreateSphere(customRenderObjectParams)}
          linkThreeObject={makeCreateLink3D(customRenderObjectParams)}
          linkThreeObjectExtend
          linkPositionUpdate={link3DPositionUpdateFn}
        />
      ) : (
        <ForceGraph2D
          {...params}
          // @ts-ignore
          ref={graph2DRef}
          nodeColor={colors.primary}
          nodeCanvasObjectMode={() => 'after'}
          nodeCanvasObject={makeCreateCircle(customRenderObjectParams) as any}
          linkCanvasObjectMode={() => 'after'}
          linkCanvasObject={makeCreateLink2D(customRenderObjectParams)}
          nodeRelSize={30}
        />
      )}
    </div>
  );
}
