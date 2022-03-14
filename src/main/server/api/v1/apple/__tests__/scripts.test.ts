import { getAddressFromInput, getServiceFromInput, buildMessageScript } from "@server/api/v1/apple/scripts";

console.log("Test");

describe("Scripts", () => {
    describe("getAddressFromInput", () => {
        it("Should just return the input when empty", () => {
            const input = ";";
            const address = getAddressFromInput(input);

            expect(address).toBe(input);
        });

        it("Should return just the address when given a valid input", () => {
            //
            const input = "some text here;4251235678";
            const address = getAddressFromInput(input);

            expect(address).toBe("4251235678");
        });

        it("Should return the last address when given two semicolons", () => {
            //
            const input = ";4251235678;425345678";
            const address = getAddressFromInput(input);

            expect(address).toBe("425345678");
        });
    });

    describe("getServiceFromInput", () => {
        it("Should return the type of service and the value", () => {
            const input = 'Liked “Can you ..."; Date: 3/13/2022, 12:53:24 PM';
            const service = getServiceFromInput(input);

            expect(service).toBe('Liked “Can you ..."');
        });

        it("Should return iMessage when when there is no semicolon", () => {
            const input = "Text with no semicolon";
            const service = getServiceFromInput(input);

            expect(service).toBe("iMessage");
        });

        it("Should return the text before the first semicolon", () => {
            const input = "Like;Reply;Dislike";
            const service = getServiceFromInput(input);

            expect(service).toBe("Like");
        });
    });

    describe("buildMessageScript", () => {
        it("Should return an empty string if the message is empty", () => {
            const message = "";
            const messageScript = buildMessageScript(message);

            expect(messageScript).toBe("");
        });

        it("Should return expected message when given valid inputs", () => {
            const message = "Hey, how's it going";
            const messageScript = buildMessageScript(message);

            const expectedMessageScript = `send "${message}" to targetBuddy}`;

            expect(messageScript).toBe(expectedMessageScript);
        });

        it("Should return expected message when given valid inputs", () => {
            const message = "¯\\_(ツ)_/¯";
            const messageScript = buildMessageScript(message);

            const expectedMessageScript = `send "¯\\\\_(ツ)_/¯" to targetBuddy}`;

            expect(messageScript).toBe(expectedMessageScript);
        });
    });
});
