export interface Unit {
    id: number;
    maxHealth: number;
    health: number;
    attack: number;
    type: string;
}

export interface PlayerUnit extends Unit {
    type: 'player';
}

export interface DragonUnit extends Unit {
    type: 'dragon';
}

export type Board = (Unit | null)[][];
