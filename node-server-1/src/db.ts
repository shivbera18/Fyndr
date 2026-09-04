import mongoose from "mongoose";
import { MONGO_URI } from "./config";

mongoose.connect(MONGO_URI);

export default mongoose;
