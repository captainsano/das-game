export interface Unit {
    id: number;
    maxHealth: number;
    health: number;
    attack: number;
    type: string;
}

export interface EmptyUnit extends Unit {
    type: 'EMPTY'
}

export interface KnightUnit extends Unit {
    type: 'KNIGHT'
}

export interface DragonUnit extends Unit {
    type: 'DRAGON';
}

export type Board = Unit[][];
