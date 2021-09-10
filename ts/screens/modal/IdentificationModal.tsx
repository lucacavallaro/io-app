import { Content, Text } from "native-base";
import * as React from "react";
import { StyleSheet } from "react-native";
import { ComponentProps, useState } from "react";
import customVariables from "../../theme/variables";
import ButtonDefaultOpacity from "../../components/ButtonDefaultOpacity";

const styles = StyleSheet.create({
  header: {
    fontSize: 20,
    lineHeight: 22
  },
  bottomContainer: {
    position: "absolute",
    bottom: 20,
    alignSelf: "center"
  },
  contentContainerStyle: {
    flexGrow: 1,
    justifyContent: "center",
    alignSelf: "center",
    flex: 1,
    padding: customVariables.contentPadding
  }
});

const Button = (props: ComponentProps<typeof ButtonDefaultOpacity>) => (
  <ButtonDefaultOpacity {...props} />
);

const sleep = (): Promise<void> =>
  new Promise(resolve => {
    setTimeout(resolve, 20);
  });

const heavyCode = async () => {
  let n = 100000000;
  while (n > 0) {
    n--;
    await sleep();
  }
};

const heavyCodeAsync = (): Promise<void> =>
  new Promise(resolve => {
    heavyCode();
    resolve();
  });

const initialCounter = 1;
export const Counter = () => {
  const [counter, setCounter] = useState(initialCounter);
  return (
    <Content contentContainerStyle={styles.contentContainerStyle}>
      <Button onPress={() => setCounter(c => c + 1)}>
        <Text>Increase counter</Text>
      </Button>
      <Text style={{ marginTop: 4 }}>{`counter: ${counter}`}</Text>

      <Button
        style={{ marginTop: 14 }}
        primary={true}
        bordered={true}
        onPress={async () => await heavyCode()}
      >
        <Text>🔥🔥 run heavy code</Text>
      </Button>

      <Button
        style={{ marginTop: 14 }}
        primary={true}
        bordered={true}
        onPress={() => setCounter(initialCounter)}
      >
        <Text>reset</Text>
      </Button>
    </Content>
  );
};
