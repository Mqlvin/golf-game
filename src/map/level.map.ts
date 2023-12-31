import { Container, DisplayObject } from "pixi.js";
import { DynamicTile } from "./tile/dynamic-tile.map";
import { StaticTile } from "./tile/static-tile.map";
import { Vec2 } from "../util/vector.util";
import { AssetManager } from "../core/asset-manager.core";
import { Level, logger } from "../logger/logger";
import { MapTileInstantiator } from "./tile/tile-instantiator.map";
import { GamePlayer } from "../core/player/player.player";


export class GameLevel {
    private _stage: Container<DisplayObject>;
    private _player: GamePlayer;

    private _staticTiles: StaticTile[];
    private _dynamicTiles: DynamicTile[];

    private _hasWalls: boolean;
    private _ballSpawn: Vec2;

    private _staticTileContainer: Container;
    private _dynamicTileContainer: Container;
    private _wallContainer: Container;

    constructor(stage: Container<DisplayObject>, _staticTiles: StaticTile[], _dynamicTiles: DynamicTile[], _hasWalls: boolean, _ballSpawn: Vec2) {
        this._stage = stage;

        this._staticTiles = _staticTiles;
        this._dynamicTiles = _dynamicTiles;
        this._hasWalls = _hasWalls;
        this._ballSpawn = _ballSpawn.multVec(new Vec2(64, 64)).addVec(new Vec2(32, 32)); // center the ball in the square
        console.log(this._ballSpawn.toString());

        this._staticTileContainer = undefined!;
        this._dynamicTileContainer = undefined!;
        this._wallContainer = undefined!;

        this._player = new GamePlayer(AssetManager.i().getAssetQuery("golf:ball_blue_small"), this._ballSpawn, this._stage);
    }

    constructScene(): void {
        this.generateStaticTileContainer();
        this.generateDynamicTileContainer();

        // NOTE: Order of addChild() is IMPORTANT. Only call add child in this function. Don't start calling it elsewhere.

        this._stage.addChild(this._staticTileContainer);
        this._stage.addChild(this._dynamicTileContainer);

        this._stage.addChild(this._player.launchLine.getGraphics());
        this._stage.addChild(this._player.sprite);
    }

    private generateStaticTileContainer(): void {
        let container: Container = new Container();

        this._staticTiles.forEach((tile: StaticTile) => {
            container.addChild(tile.sprite);
        });

        this._staticTileContainer = container;
    }

    private generateDynamicTileContainer(): void {
        let container: Container = new Container();

        this._dynamicTiles.forEach((tile: DynamicTile) => {
            container.addChild(tile.sprite);
        });

        this._dynamicTileContainer = container;
    }

    public get hasWalls(): boolean {
        return this._hasWalls;
    }

    public get spawnPoint(): Vec2 {
        return this._ballSpawn;
    }

    public get stage() {
        return this._stage;
    }

    updateAllSprites(): void {
        this._dynamicTiles.forEach((tile: DynamicTile) => tile.update(this));

        this._player.update(this);
    }






    /*
     * Constructs a game level object. Only returns a `GameLevel` object if level loaded successfully.
     */
    public static create(stage: Container<DisplayObject>, gameLevelJson: any): GameLevel | undefined {
        if(!hasGoodLevelIntegrity(gameLevelJson)) {
            logger(Level.ERROR, "Unable to load game level: Bad level integrity.");
            return undefined;
        }
    
        try {
            let level: GameLevel = createGameLevelObject(stage, gameLevelJson);
            logger(Level.DEBUG, "Successfully loaded game level object.");
            return level;
        } catch(ex) {
            logger(Level.ERROR, "Unable to load game level: Could not construct `GameLevel` object.");
            return undefined;
        }
    }
}





// TODO: Improve this method maybe, add some more sophisticated checking e.g. types on certain values, are there any levels?
/*
 * Roughly verifies the integrity of the JSON object of a level. Returns false if the JSON is bad.
 */
function hasGoodLevelIntegrity(gameLevelJson: any): boolean {
    let keys: String[] = Object.keys(gameLevelJson);
    
    if(!keys.includes("spawnPos")) return false;
    if(!keys.includes("levelIndex")) return false;
    if(!keys.includes("hasWalls")) return false;
    if(!keys.includes("staticTiles")) return false;
    if(!keys.includes("dynamicTiles")) return false;

    return true;
}



/*
 * Private function for the actual method parsing a level JSON, and constructing that into an object.
 * Code in this function can be unsafe as it's all caught by a try/catch on method call (this is bad practice).
 */
function createGameLevelObject(stage: Container<DisplayObject>, gameLevelJson: any): GameLevel {
    // loop through 2d array, generate all sprites in rows and set appropriate pos
    let levelBoard: [] = gameLevelJson["staticTiles"];
    let staticSprites: StaticTile[] = [];

    for(let i: number = 0; i < levelBoard.length; i++) {
        let row: string[] = levelBoard[i];
        let j = 0;
        // for every `assetId`, check if null, if so just increment `j` (x value), otherwise construct sprite based off `assetId`
        row.forEach((assetId: string) => {
            if(assetId != "null") {
                staticSprites.push(
                    MapTileInstantiator.static(assetId, new Vec2(j * AssetManager.getDefaultAssetWidth(), i * AssetManager.getDefaultAssetWidth()))
                );
            }
            j++;
        });
    }
    // the `staticSprites` variable is now populated

    // TODO: Load dynamic sprites
    let levelDynSprites: [] = gameLevelJson["dynamicTiles"];
    let dynamicSprites: DynamicTile[] = [];

    console.log(levelDynSprites)
    for(let i: number = 0; i < levelDynSprites.length; i++) {
        let row: string[] = levelDynSprites[i];
        let j = 0;
        // for every `assetId`, check if null, if so just increment `j` (x value), otherwise construct sprite based off `assetId`
        
        row.forEach((assetId: string) => {
            if(assetId != "null") {
                let newTile: DynamicTile | undefined = undefined;
                newTile = MapTileInstantiator.dynamic(assetId, new Vec2(j * AssetManager.getDefaultAssetWidth(), i * AssetManager.getDefaultAssetWidth()));

                if(newTile != undefined) dynamicSprites.push(newTile);
                else throw new Error(); // stop loading level - load file is incorrect
            }
            j++;
        });
    }

    // the `dynamicSprites` variable is now populated

    // load other two fields
    let spawnPos: Vec2 = new Vec2(parseInt(gameLevelJson["spawnPos"]["x"]), parseInt(gameLevelJson["spawnPos"]["y"]));
    let hasWalls: boolean = gameLevelJson["hasWalls"] === "true" ? true : false;

    

    let level: GameLevel = new GameLevel(
        stage,
        staticSprites,
        dynamicSprites,
        hasWalls,
        spawnPos
    );

    return level;
}