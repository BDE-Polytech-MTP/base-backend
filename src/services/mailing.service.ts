import { UnregisteredUser } from "../models";

export interface MailingService {

    sendRegistrationMail(user: UnregisteredUser): Promise<void>;

}