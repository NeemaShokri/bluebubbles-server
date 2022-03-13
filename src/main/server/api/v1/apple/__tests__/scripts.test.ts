console.log("Test");

import { getAddressFromInput,
         getServiceFromInput,
         buildMessageScript } from './scripts';

describe('Scripts', () => {
    describe('getAddressFromInput', () => {
        it('Should just return the input when empty', () => {
            const input: string = ';';
            const address: string = getAddressFromInput(input);

            expect(address).toBe(input);
        });

        it('Should return just the address when given a valid input', () => {
            //
            const input: string = 'some text here;4251235678';
            const address: string = getAddressFromInput(input);

            expect(address).toBe('4251235678');           
        });

        it('Should return the last address when given two semicolons', () => {
            //
            const input: string = ';4251235678;425345678';
            const address: string = getAddressFromInput(input);

            expect(address).toBe('425345678');           
        });
    });

    describe('getServiceFromInput', () => {
        it('Should return the type of service and the value', () => {
            const input: string = "Liked \“Can you ...\"; Date: 3/13/2022, 12:53:24 PM";
            const service: string = getServiceFromInput(input);

            expect(service).toBe("Liked \“Can you ...\"");
        });

        it('Should return iMessage when when there is no semicolon', ()=> {
            const input: string = "Text with no semicolon";
            const service: string = getServiceFromInput(input);

            expect(service).toBe("iMessage");
        });

        it('Should return the text before the first semicolon', () => {
            const input: string = "Like;Reply;Dislike";
            const service: string = getServiceFromInput(input);

            expect(service).toBe("Like");
        });
    });

    describe('buildMessageScript', () => {
        it('Should return an empty string if the message is empty', () => {
            const message: string = "";
            const messageScript: string = buildMessageScript(message);

            expect(messageScript).toBe("");
        });

        it('Should return expected message when given valid inputs', () => {
            const message: string = "Hey, how's it going";
            const messageScript: string = buildMessageScript(message);
            
            const expectedMessageScript: string = `send "${message}" to targetBuddy}`

            expect(messageScript).toBe(expectedMessageScript);
        });


        it('Should return expected message when given valid inputs', () => {
            const message: string = "¯\\_(ツ)_/¯";
            const messageScript: string = buildMessageScript(message);
            
            const expectedMessageScript: string = `send "¯\\\\_(ツ)_/¯" to targetBuddy}`

            expect(messageScript).toBe(expectedMessageScript);
        });

    });
});