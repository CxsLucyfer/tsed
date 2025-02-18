import {jest} from "@jest/globals";
import {PlatformApplication, PlatformTest} from "@tsed/common";
import {ApolloService} from "./ApolloService";

jest.mock("apollo-server-express", () => {
  return {
    ApolloServer: class {
      start = jest.fn();
      getMiddleware = jest.fn();
    }
  };
});
jest.mock("apollo-server-koa", () => {
  return {
    ApolloServer: class {
      start = jest.fn();
      getMiddleware = jest.fn();
    }
  };
});

describe("ApolloService", () => {
  describe("when platform is express", () => {
    beforeEach(() =>
      PlatformTest.create({
        PLATFORM_NAME: "express"
      })
    );
    afterEach(() => {
      return PlatformTest.reset();
    });

    describe("createServer()", () => {
      describe("when server options isn't given", () => {
        it("should create a server", async () => {
          // GIVEN
          const service = PlatformTest.get<ApolloService>(ApolloService);
          const app = PlatformTest.get(PlatformApplication);

          jest.spyOn(app, "use").mockReturnThis();

          // WHEN
          const result1 = await service.createServer("key", {
            path: "/path"
          } as any);

          const result2 = await service.createServer("key", {path: "/path"} as any);

          expect(service.getSchema("key")).toEqual(undefined);
          expect(service.getSchema()).toEqual(undefined);
          expect(result2).toEqual(result1);
          expect(result1.getMiddleware).toHaveBeenCalledWith({
            path: "/path"
          });
        });
      });
    });
  });
  describe("when platform is koa", () => {
    beforeEach(() =>
      PlatformTest.create({
        PLATFORM_NAME: "koa"
      })
    );
    afterEach(() => {
      return PlatformTest.reset();
    });

    describe("createServer()", () => {
      describe("when server options isn't given", () => {
        it("should create a server", async () => {
          // GIVEN
          const service = PlatformTest.get<ApolloService>(ApolloService);
          const app = PlatformTest.get(PlatformApplication);

          jest.spyOn(app, "use").mockReturnThis();

          // WHEN
          const result1 = await service.createServer("key", {
            path: "/path"
          } as any);

          const result2 = await service.createServer("key", {path: "/path"} as any);

          expect(service.getSchema("key")).toEqual(undefined);
          expect(service.getSchema()).toEqual(undefined);
          expect(result2).toEqual(result1);
          expect(result1.getMiddleware).toHaveBeenCalledWith({
            path: "/path"
          });
        });
      });
    });
  });
  describe("when platform is unknown", () => {
    beforeEach(() =>
      PlatformTest.create({
        PLATFORM_NAME: "unkown"
      })
    );
    afterEach(() => {
      return PlatformTest.reset();
    });

    describe("createServer()", () => {
      describe("when server options isn't given", () => {
        it("should create a server", async () => {
          // GIVEN
          const service = PlatformTest.get<ApolloService>(ApolloService);
          const app = PlatformTest.get(PlatformApplication);

          jest.spyOn(app, "use").mockReturnThis();

          // WHEN
          const result1 = await service.createServer("key", {
            path: "/path"
          } as any);

          const result2 = await service.createServer("key", {path: "/path"} as any);

          expect(service.getSchema("key")).toEqual(undefined);
          expect(service.getSchema()).toEqual(undefined);
          expect(result2).toEqual(result1);
          expect(result1.getMiddleware).toHaveBeenCalledWith({
            path: "/path"
          });
        });
      });
    });
  });
  describe("when platform is given", () => {
    beforeEach(() =>
      PlatformTest.create({
        PLATFORM_NAME: "express"
      })
    );
    afterEach(() => {
      return PlatformTest.reset();
    });

    describe("createServer()", () => {
      describe("when server options isn't given", () => {
        it("should create a server", async () => {
          // GIVEN
          const service = PlatformTest.get<ApolloService>(ApolloService);
          const app = PlatformTest.get(PlatformApplication);

          jest.spyOn(app, "use").mockReturnThis();

          class ApolloServer {
            start = jest.fn();
            getMiddleware = jest.fn();

            constructor(opts: any) {}
          }

          // WHEN
          const result1 = await service.createServer("key", {
            path: "/path",
            server: (options: any) => new ApolloServer(options)
          } as any);

          expect(service.getSchema("key")).toEqual(undefined);
          expect(service.getSchema()).toEqual(undefined);
          expect(result1.getMiddleware).toHaveBeenCalledWith({
            path: "/path"
          });
        });
      });
    });
  });
});
