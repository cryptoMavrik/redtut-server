import { MikroORM } from "@mikro-orm/core";
import mikroConf from "./mikro-orm.config";
import express from 'express';
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from 'type-graphql';
import { HelloResolver } from "./resolvers/hello";
import { PostResolver } from "./resolvers/post";
import { UserResolver } from "./resolvers/user";
import redis from 'redis';
import session from 'express-session';
import connectRedis from 'connect-redis';
import { PROD } from "./constants";
import { MyContext } from "./types";

const main = async () => {
    const orm = await MikroORM.init(mikroConf);
    await orm.getMigrator().up();

    const app = express();

    const RedisStore = connectRedis(session)
    const redisClient = redis.createClient()

    app.use(
        session({
            name: 'qid',
            store: new RedisStore({
                client: redisClient,
                disableTTL: true,
            }),
            cookie: {
                maxAge: 1000 * 60 * 60 * 24 * 365 * 10, //10 years 
                httpOnly: true,
                secure: PROD, //cookie only works in https
                sameSite: "lax" // csrf
            },
            saveUninitialized: false,
            secret: 'jfdsoijsoijsoijsoifjsofijs',
            resave: false,
        }),
    )

    const apolloServer = new ApolloServer({
        schema: await buildSchema({
            resolvers: [HelloResolver, PostResolver, UserResolver],
            validate: false
        }),
        context: ({ req, res }): MyContext => ({ em: orm.em, req, res })
    })
    await apolloServer.start()
    apolloServer.applyMiddleware({ app });

    app.listen(4000, () => {
        console.log("server started on Port 4000");

    })
};

main().catch((err) => {
    console.error(err);
})
