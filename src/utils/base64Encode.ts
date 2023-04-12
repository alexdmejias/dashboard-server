function base64Encode(string: string) {
  return Buffer.from(string).toString("base64");
}

export default base64Encode;
