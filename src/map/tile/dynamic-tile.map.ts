import { MapTile } from "./tile.map";

/*
 * A placeholder class holding fields for dynamic tiles on the map, such as collidable tiles.
 */

export abstract class DynamicTile extends MapTile {
    abstract update(): void;
}