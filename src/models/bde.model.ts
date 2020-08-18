export interface BDE {

    /** BDE unique identifier */
    bdeUUID: string;

    /** BDE name */
    bdeName: string;

    /** Available specialties for this BDE */
    specialties: { name: string, minYear: number, maxYear: number}[];

}