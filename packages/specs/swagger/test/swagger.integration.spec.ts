import {BodyParams, Controller, Get, PathParams, PlatformTest, Post} from "@tsed/common";
import {ObjectID} from "@tsed/mongoose";
import {PlatformExpress} from "@tsed/platform-express";
import {Consumes, Description, Returns} from "@tsed/schema";
import {Docs, Hidden} from "@tsed/swagger";
import SuperTest from "supertest";
import {Calendar} from "./app/models/Calendar";
import {Server} from "./app/Server";

@Controller("/admin")
@Hidden()
class AdminCtrl {
  @Get("/")
  get() {}
}

@Controller("/events")
class EventCtrl {
  @Get("/")
  @Description("Events")
  get() {}
}

@Controller("/admin")
@Docs("admin")
class BackAdminCtrl {
  @Get("/")
  @Description("Admins")
  get() {}
}

@Controller({
  path: "/calendars",
  children: [AdminCtrl, EventCtrl]
})
class CalendarsController {
  @Get("/:id")
  @Returns(200, Calendar)
  async get(@PathParams("id") @ObjectID() id: string): Promise<Calendar> {
    return new Calendar({id, name: "test"});
  }

  @Get("/")
  @Returns(200, Array).Of(Calendar)
  async getAll(): Promise<Calendar[]> {
    return [new Calendar({id: 1, name: "name"}), new Calendar({id: 2, name: "name"})];
  }

  @Post("/csv")
  @Consumes("text/plain")
  @Returns(200, String).ContentType("text/plain")
  async csv(@BodyParams() csvLines: string): Promise<string> {
    return "";
  }

  @Get("/hidden")
  @Hidden()
  @Description("Admins")
  getHidden() {}
}

describe("Swagger integration", () => {
  describe("OpenSpec2", () => {
    let request: SuperTest.SuperTest<SuperTest.Test>;
    beforeEach(
      PlatformTest.bootstrap(Server, {
        platform: PlatformExpress,
        mount: {
          "/rest": [CalendarsController]
        }
      })
    );
    beforeEach(() => {
      request = SuperTest(PlatformTest.callback());
    });
    afterEach(PlatformTest.reset);

    it("should swagger spec", async () => {
      const response = await request.get("/v2/doc/swagger.json").expect(200);
      const result = await request.get("/rest/calendars").expect(200);

      expect(result.body).toEqual([
        {
          id: 1,
          name: "name"
        },
        {
          id: 2,
          name: "name"
        }
      ]);
      expect(response.body).toMatchSnapshot();
    });
  });
  describe("OpenSpec3", () => {
    let request: SuperTest.SuperTest<SuperTest.Test>;
    beforeEach(
      PlatformTest.bootstrap(Server, {
        platform: PlatformExpress,
        mount: {
          "/rest": [CalendarsController]
        }
      })
    );
    beforeEach(() => {
      request = SuperTest(PlatformTest.callback());
    });
    afterEach(PlatformTest.reset);

    it("should swagger spec", async () => {
      const response = await request.get("/v3/doc/swagger.json").expect(200);
      const result = await request.get("/rest/calendars").expect(200);

      expect(result.body).toEqual([
        {
          id: 1,
          name: "name"
        },
        {
          id: 2,
          name: "name"
        }
      ]);

      expect(response.body).toMatchSnapshot();
    });
  });
});
