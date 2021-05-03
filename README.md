## Sub Graphs for Unreal Finance

## Installation
1. Docker

2. Node Modules
    ```sh
    npm install
    ```

## Development

1. Start hardhat node in contracts
    ```sh
    npx hardhat node --hostname 0.0.0.0
    ```

2. Deploy contracts and generate events

    ```sh
    npx hardhat run scripts/deployMocks.ts --network localhost
    ```

3. Start the graph node

    ```sh
    cd docker/graph-node
    docker-compose up
    ```
    **Note: -** remove docker/graph-node/data folder when you re run docker container

4. Create subgraph and deploy
    ```sh
    npm run codegen
    npm run create-local
    npm run deploy-local
    ```