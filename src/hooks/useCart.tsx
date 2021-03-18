import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    const isAlreadyInCart =
      cart.findIndex((item) => item.id === productId) !== -1;

    try {
      const product = await api.get(`/products/${productId}`);

      const amountInStock = await api.get(`/stock/${productId}`);

      if (isAlreadyInCart) {
        const currentAmount = cart.filter((item) => item.id === productId)[0]
          .amount;

        if (amountInStock.data.amount < currentAmount) {
          toast.error("Quantidade solicitada fora de estoque");
        } else {
          const addingAmount = cart.filter((item) =>
            item.id === productId
              ? { ...item, amount: (item.amount += 1) }
              : item
          );

          setCart(addingAmount);
          localStorage.setItem(
            "@RocketShoes:cart",
            JSON.stringify(addingAmount)
          );
        }
      } else {
        setCart([...cart, { ...product.data, amount: 1 }]);
        localStorage.setItem(
          "@RocketShoes:cart",
          JSON.stringify([...cart, { ...product.data, amount: 1 }])
        );
      }
    } catch (err) {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    const hasProductWithId =
      cart.findIndex((item) => item.id === productId) !== -1;

    if (!hasProductWithId) {
      toast.error("Erro na remoção do produto");
    } else {
      const filteredProduct = cart.filter((item) => item.id !== productId);
      try {
        setCart(filteredProduct);
        localStorage.setItem(
          "@RocketShoes:cart",
          JSON.stringify(filteredProduct)
        );
      } catch {
        toast.error("Erro na remoção do produto");
      }
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const { data } = await api.get(`/stock/${productId}`);
      const inStock = data.amount;

      if (amount <= 0) {
        return;
      }

      if (inStock < amount) {
        toast.error("Quantidade solicitada fora de estoque");
      } else {
        const updatedAmount = cart.filter((item) =>
          item.id === productId
            ? { ...item, amount: (item.amount = amount) }
            : item
        );

        setCart(updatedAmount);
        localStorage.setItem(
          "@RocketShoes:cart",
          JSON.stringify(updatedAmount)
        );
      }
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
