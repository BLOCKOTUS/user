export type UserType = {
    _id
    lastJobAttribution: number;
    publicKey: string;
    registryDate: number;
    username: string;
};

export type DIDUrl = string;

export type ParsedDIDUrl = {
    methodName: string;
    methodSpecificId: string;
    urlPath?: Array<string>;
    query?: Record<string, any>;
    fragment?: string;
};

type VerificationMethodBase = {
    id: string;
    type: string;
    controller: string;
};

type PublicKeyBase = {
    id: string;
    type: string;
    controller: string;
};

type VerificationMethod = VerificationMethodBase;

type Service = {
    id: string;
    type: string;
    serviceEndpoint: string;
};

type PublicKey = PublicKeyBase;

export type DidDocument = {
    '@context': Array<string> | string;
    id: string;
    controller?: string;
    verificationMethod?: Array<VerificationMethod>;
    publicKey?: Array<PublicKey>;
    service?: Array<Service>;
    created?: string;
    updated?: string;
    blockotus?: any; 
};

export type DidDocumentConstructor = {
    context?: Array<string> | string;
    id?: string;
    subject?: { organ: string, organSpecificId: string };
    controller?: string;
    verificationMethod?: Array<VerificationMethod>;
    publicKey?: Array<PublicKey>;
    service?: Array<Service>;
    created?: string;
    updated?: string;
    blockotus?: any; 
};

export type ApiCreateArgs = {
    username: string,
    publicKey: string,
};

type Wallet = {
    credentials: {
        certificate: string;
        privateKey: string;
    }
    mspId: string;
    type: string;
};

export type ApiCreateArgsReturn = Promise<{
    id: string,
    wallet: Wallet,
}>;
